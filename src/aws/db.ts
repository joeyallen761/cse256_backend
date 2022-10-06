import DynamoDB from "aws-sdk/clients/dynamodb";
import {AppJSONHeaders, BaseURL, METHODS, TableName} from "./aws-constants";
import {AwsClient} from "aws4fetch";
//
// {
//     "TableName": "CSE256-Data-Testing",
//     "Key": {
//          "PKMeta": {"S": "#CLASS:ProjectName"},
//          "SKMeta": {"S": "#PROJECT_NAME:Cognitive Load"}
//     }
// }
//

export let table: ClassTable | null = null;

export const createTable = (awsFetchClient: AwsClient) => {
    table = new ClassTable(awsFetchClient);
}

export const getTable = () => {
    return table;
}

enum Types {
    Bool,
    Num,
    Str
}

class PrimaryKey {

    public static readonly parsePrefixRegEx = /^#([a-zA-Z0-9_.]+):/;
    public static readonly parseDataRegEx = /^#[a-zA-Z0-9_.]+:([a-zA-Z0-9_.]+)/;

    public static getPrefixFromPK(pk: string): string {
        return (PrimaryKey.parsePrefixRegEx.exec(pk) as RegExpExecArray)[1];
    }

    private readonly name: string;
    private readonly prefix: string;
    private readonly metaDataKeyName: string;
    private readonly metaDataType: Types;

    constructor(name: string, prefix: string, metaDataKeyName: string, metaDataType: Types) {
        this.name = name;
        this.prefix = prefix;
        this.metaDataKeyName = metaDataKeyName;
        this.metaDataType = metaDataType;
    }

    getName(): string {
        return this.name;
    }

    getMetaDataKeyName(): string {
        return this.metaDataKeyName;
    }

    getMetaDataType(): Types {
        return this.metaDataType;
    }

    toMetaDataFromData(data: DynamoDB.DocumentClient.AttributeMap): string {
        return this.toMetaData(data[this.name]);
    }

    toMetaData(key: string) {
        return (PrimaryKey.parseDataRegEx.exec(key) as RegExpExecArray)[1];
    }

    toString(data: string) {
        return `#${this.prefix}:${data}`;
    }

}

type SKMetaData = {
    key: string,
    value: string
}[];

class SortKey {

    public static readonly prefixRegEx = /([a-zA-Z0-9_.]+)/;
    public static readonly parsePrefixRegEx = /^#([a-zA-Z0-9_.]+):/;

    public static getPrefixFromSK(sk: string): string {
        return (SortKey.parsePrefixRegEx.exec(sk) as RegExpExecArray)[1];
    }

    private readonly name: string;
    private readonly prefix: string;
    private readonly metaDataKeyNames: string[];
    private readonly metaDataTypes: Types[];

    constructor(name: string, prefix: string, metaDataKeyNames: string[], metaDataTypes: Types[]) {
        if (!SortKey.prefixRegEx.test(prefix)) {
            throw new Error('Prefix is only allowed to take format: /([a-zA-Z0-9_.]+)/.');
        }
        this.name = name;
        this.prefix = prefix;
        this.metaDataKeyNames = metaDataKeyNames;
        this.metaDataTypes = metaDataTypes;
    }

    getName(): string {
        return this.name;
    }

    getMetaDataKeyNames(): string[] {
        return this.metaDataKeyNames;
    }

    getMetaDataTypes(): Types[] {
        return this.metaDataTypes;
    }

    toMetaDataFromData(data: DynamoDB.DocumentClient.AttributeMap) {
        return this.toMetaData(data[this.name]);
    }

    toMetaData(key: string): SKMetaData {
        if (key[0] === '#') {
            key = key.slice(1); // Slice pound off of front of string
            const values = key.split(':');
            if ((values.length - 1) === this.metaDataKeyNames.length) {
                const ret: SKMetaData = [];
                values.forEach((value, index) => {
                   if (index > 0) { // Skip prefix string
                       ret.push({
                           key: this.metaDataKeyNames[index - 1],
                           value: value
                       });
                   }
                });
                return ret;
            }
            throw new Error(`Provided key does not have the expected number of values.`)
        }
        throw new Error(`Provided key does not follow expected pattern. Missing '#' at front of string.`)
    }

    toString(obj: any) {
        let ret = `#${this.prefix}`;
        this.metaDataKeyNames.forEach(key => {
            const val = '' + obj[key];
            if (val === undefined || val === null) {
                throw new Error(`Provided object must have a non-null value for every key in sort key metaData. This object was missing at least this key: ${key}.`);
            }
            if (val.indexOf(':') !== -1 || val.indexOf('#') !== -1) {
                throw new Error('Sort Key meta data cannot include # or : in it. This will ruin the invariant that allows the parser to work.')
            }
            ret += `:${val}`;
        });
        return ret;
    }
}

interface EntityConstructor {
    new (data: DynamoDB.DocumentClient.AttributeMap): IEntity;
    readonly sortKeyPrefix: string;
    readonly primaryKeyPrefix: string;
}

interface IEntity {
    primaryKey(): PrimaryKey;
    sortKey(): SortKey;
    toDBForm(): DynamoDB.DocumentClient.PutItemInputAttributeMap;
}

abstract class AEntity implements IEntity {

    protected constructor() {}

    convert(data: string, type: Types) {
        switch (type) {
            case Types.Str:
                return data;
            case Types.Bool:
                return data.trim().toLowerCase() === 'true';
            case Types.Num:
                return Number(data);
        }
    }

    construct(data: DynamoDB.DocumentClient.AttributeMap) {
        Object.keys(data).forEach(key => {
            (this as any)[key] = data[key];
        });
        (this as any)[this.primaryKey().getMetaDataKeyName()] = this.convert(this.primaryKey().toMetaDataFromData(data), this.primaryKey().getMetaDataType());
        this.sortKey()
            .toMetaDataFromData(data)
            .forEach((metaData, index) => {
                (this as any)[metaData.key] = this.convert(metaData.value, this.sortKey().getMetaDataTypes()[index]);
            });
    }

    toDBForm(): DynamoDB.DocumentClient.PutItemInputAttributeMap {
        const ret = {};
        Object.keys(this).forEach(key => {
            if ((!this.sortKey().getMetaDataKeyNames().includes(key)) && (this.primaryKey().getMetaDataKeyName() !== key)) {
                (ret as any)[key] = (this as any)[key];
            }
        });
        return DynamoDB.Converter.marshall(ret);
    }

    abstract primaryKey(): PrimaryKey;

    abstract sortKey(): SortKey;

}

class Table {

    private readonly fetchClient: AwsClient;
    private readonly name: string;
    private readonly pkName: string;
    private readonly skName: string;
    private readonly entities: Map<string, Map<string, EntityConstructor>>;

    constructor(fetchClient: AwsClient, name: string, pkName: string, skName: string) {
        this.fetchClient = fetchClient;
        this.name = name;
        this.pkName = pkName;
        this.skName = skName;
        this.entities = new Map<string, Map<string, EntityConstructor>>();
    }

    //// Misc. helpers

    addEntity(entity: EntityConstructor): Table {
        let mapMap = this.entities.get(entity.primaryKeyPrefix);
        if (mapMap === undefined || mapMap === null) {
            mapMap = new Map<string, EntityConstructor>();
            this.entities.set(entity.primaryKeyPrefix, mapMap);
        }
        mapMap.set(entity.sortKeyPrefix, entity);
        return this;
    }

    getName(): string {
        return this.name;
    }

    getEntityConstructor(primaryKeyPrefix: string, sortKeyPrefix: string) {
        return this.entities.get(primaryKeyPrefix)?.get(sortKeyPrefix);
    }

    getKeySchema() {
        return [
            {
                KeyType: 'HASH',
                AttributeName: this.pkName
            },
            {
                KeyType: 'RANGE',
                AttributeName: this.skName
            }
        ];
    }

    getAttributeDefinitions() {
        return [
            {
                AttributeName: this.pkName,
                AttributeType: 'S'
            },
            {
                AttributeName: this.skName,
                AttributeType: 'S'
            }
        ];
    }

    getKey(pk: string, sk: string) {
        const key: any = {};
        key[this.pkName] = pk;
        key[this.skName] = sk;
        return key;
    }

    async fetchJSON(url: string, request: RequestInit) {
        return (await this.fetchClient.fetch(url, request)).json();
    }

    //// Table operations:

    // create(throughput: DynamoDB.ProvisionedThroughput) {
    //     return this.dbClient.createTable({
    //         TableName: this.name,
    //         KeySchema: this.getKeySchema(),
    //         AttributeDefinitions: this.getAttributeDefinitions(),
    //         ProvisionedThroughput: throughput
    //     }).promise();
    // }

    // delete() {
    //     return this.dbClient.deleteTable({
    //         TableName: this.name
    //     }).promise();
    // }

    // describe() {
    //     return this.dbClient.describeTable({
    //         TableName: this.name
    //     }).promise();
    // }

    async exists() {
        const path = '/db/tables';
        const url = BaseURL + path;
        let request = {
            method: METHODS.GET,
            headers: AppJSONHeaders(),
        } as any;
        const resp = await this.fetchJSON(url, request);
        return (resp.TableNames as string[]).indexOf(TableName as string) !== -1;
    }

    //// Item operations:

    async put(item: IEntity) {
        const path = '/db/table';
        const url = BaseURL + path;
        let request = {
            method: METHODS.POST,
            headers: AppJSONHeaders(),
            body: JSON.stringify({
                TableName: this.getName(),
                Item: item.toDBForm()
            })
        };
        return this.fetchJSON(url, request);
    }

    async update(pk: string, sk: string, entity: IEntity) {
        const deleted = await this.delete(pk, sk);
        console.log(deleted);
        const puted = await this.put(entity);
        console.log(puted);
    }

    async get(pk: string, sk: string) {
        const path = '/db/table/get-item';
        const url = BaseURL + path;
        const key = this.getKey(pk, sk);
        const request = {
            method: METHODS.POST,
            headers: AppJSONHeaders(),
            body: JSON.stringify({
                TableName: this.getName(),
                Key: DynamoDB.Converter.marshall(key)
            })
        };
        const item = DynamoDB.Converter.unmarshall((await this.fetchJSON(url, request))['Item']);
        if (item === undefined) {
            return item;
        }
        const ctor = this.getEntityConstructor(PrimaryKey.getPrefixFromPK(item[this.pkName]), SortKey.getPrefixFromSK(item[this.skName]));
        return new (ctor as any)(item);
    }

    async delete(pk: string, sk: string) {
        const path = '/db/table';
        const url = BaseURL + path;
        const key = this.getKey(pk, sk);
        const request = {
            method: METHODS.DELETE,
            headers: AppJSONHeaders(),
            body: JSON.stringify({
                TableName: this.getName(),
                Key: DynamoDB.Converter.marshall(key)
            })
        };
        console.log(await this.fetchJSON(url, request));
        // const item = DynamoDB.Converter.unmarshall((await this.fetchJSON(url, request))['Item']);
    }

    async query(keyConditionExpression: string, expressionAttributeValues: {[key: string]: any}): Promise<{[p: string]: any}[]> {
        const path = '/db/table/query';
        const url = BaseURL + path;
        let request = {
            method: METHODS.POST,
            headers: AppJSONHeaders(),
            body: JSON.stringify({
                TableName: this.getName(),
                KeyConditionExpression: keyConditionExpression,
                ExpressionAttributeValues: DynamoDB.Converter.marshall(expressionAttributeValues)
            })
        };
        return (await this.fetchJSON(url, request))['Items'].map((item: DynamoDB.AttributeMap) => DynamoDB.Converter.unmarshall(item));
    }

}

export class ClassTable extends Table {

    public static readonly Name = TableName as string;
    public static readonly PKName = 'PKMeta';
    public static readonly SKName = 'SKMeta';

    constructor(fetchClient: AwsClient) {
        super(fetchClient, ClassTable.Name, ClassTable.PKName, ClassTable.SKName);
        this.addEntity(HIT)
            .addEntity(ProjectDescription);
        // this.getProjectNames().then(console.log).catch(console.log)
    }

    async deleteEntity(entity: ClassTableEntity) {
        return this.delete(entity.PKMeta, entity.SKMeta);
    }

    async getEntity(entity: ClassTableEntity) {
        return this.get(entity.PKMeta, entity.SKMeta);
    }

    async getProjectNames() {
        return (await this.query(
            'PKMeta = :pk AND begins_with(SKMeta, :skp)',
            {
                ':pk': ProjectDescription.PK,
                ':skp': '#' + ProjectDescription.sortKeyPrefix
            }))
            .map(item => new ProjectDescription(item));
    }

    async incrementHITCount(wustlKey: string, sortKeyData: HITSortKeyData) {
        // const key = this.getKey(wustlKey, HIT.sortKey.toString(sortKeyData));
        // const ret = await this.docClient.update({
        //     TableName: this.getName(),
        //     Key: key,
        //     ExpressionAttributeValues: {':c': 1},
        //     UpdateExpression: 'ADD Cnt :c',
        //     ReturnValues: 'ALL_OLD'
        // }).promise();
        // return (this.getEntityConstructor(HIT.sortKeyPrefix))(ret.)
        // return ret;
    }

    async createLogEntry(hitID: string, assignmentID: string, workerID: string, key: string, time: string) {
        const log = Log.Create(hitID, assignmentID, workerID, key, time);
        const resp = await this.put(log);
        return log;
    }

    async getLogEntries(keyMidFix: string) {
        return (await this.query(
            'PKMeta = :pk',
            {
                ':pk': '#STUDENT:D'
            },
        )).
        map(item => new Log(item)).
        filter(log => log.Key.includes(keyMidFix)).
        filter(log => !log.Key.includes('riley.mccuen.t'));
    }

}

type HITSortKeyData = {
    ProjectName: string,
    Iteration: number,
    HITName: string
}

abstract class ClassTableEntity extends AEntity {
    // @ts-ignore
    PKMeta: string;      // Partition Key
    // @ts-ignore
    SKMeta: string;      // Sort Key

}

export class Task {
    tag: string;
    description: string;

    constructor(tag: string, description: string) {
        this.tag = tag;
        this.description = description;
    }
}

export class ProjectDescription extends ClassTableEntity {

    static ProjectName = 'ProjectName';
    static primaryKeyPrefix = 'CLASS';
    static sortKeyPrefix = 'PROJECT_NAME';
    static PK = '#' + ProjectDescription.primaryKeyPrefix + ':' + ProjectDescription.ProjectName;
    public static readonly primaryKey = new PrimaryKey(ClassTable.PKName, ProjectDescription.primaryKeyPrefix, ProjectDescription.ProjectName, Types.Str);
    public static readonly sortKey = new SortKey(ClassTable.SKName, ProjectDescription.sortKeyPrefix, ['Name'], [Types.Str]);

    // @ts-ignore
    ProjectName: string;
    // @ts-ignore
    Name: string;
    // @ts-ignore
    Tasks: string;
    parsedTags: Task[];

    constructor(data: DynamoDB.DocumentClient.AttributeMap) {
        data['ProjectName'] = ProjectDescription.ProjectName;
        super();
        this.construct(data);
        // @ts-ignore
        if (this.Tasks === undefined) {
            this.parsedTags = [];
        } else {
            this.parsedTags = JSON.parse(this.Tasks).map((task: any) => new Task(task.tag, task.description));
        }
    }

    primaryKey(): PrimaryKey {
        return ProjectDescription.primaryKey;
    }

    sortKey(): SortKey {
        return ProjectDescription.sortKey;
    }

    get sortKeyPrefix(): string {
        return ProjectDescription.sortKeyPrefix;
    }

    public static Create(name: string, tasks: string) {
        if (tasks === '') {
            tasks = '[]';
        }
        return new ProjectDescription({
            PKMeta: ProjectDescription.PK,
            SKMeta: this.sortKey.toString({Name: name}),
            Tasks: tasks
        });
    }

}

export class HIT extends ClassTableEntity {

    static primaryKeyPrefix = 'STUDENT';
    static sortKeyPrefix = 'HIT';
    public static readonly primaryKey = new PrimaryKey(ClassTable.PKName, HIT.primaryKeyPrefix, 'WUSTLKey', Types.Str);
    public static readonly sortKey = new SortKey(ClassTable.SKName, HIT.sortKeyPrefix, ['ProjectName', 'Iteration', 'HITName'], [Types.Str, Types.Num, Types.Str]);

    // @ts-ignore
    WUSTLKey: string;    // WUSTLKey
    // @ts-ignore
    ProjectName: string; // ProjectName
    // @ts-ignore
    Iteration: number;   // Iteration
    // @ts-ignore
    HITName: string;     // HITName
    // @ts-ignore
    Cnt: number;         // Cnt (short for Count or Counter which are both reserved keywords)
    // @ts-ignore
    AWSIDs: string[];    // AWSIDs

    constructor(data: DynamoDB.DocumentClient.AttributeMap) {
        super();
        this.construct(data);
    }

    primaryKey(): PrimaryKey {
        return HIT.primaryKey;
    }

    sortKey(): SortKey {
        return HIT.sortKey;
    }

    get sortKeyPrefix(): string {
        return HIT.sortKeyPrefix;
    }

    public static Create(wustlKey: string, projectName: string, iteration: number, hitName: string, cnt: number, awsIDs: string[]) {
        return new HIT({
            PKMeta: this.primaryKey.toString(wustlKey),
            SKMeta: this.sortKey.toString({ProjectName: projectName, Iteration: iteration, HITName: hitName}),
            Cnt: cnt,
            AWSIDs: awsIDs
        });
    }

}

export class Log extends ClassTableEntity {

    static primaryKeyPrefix = 'STUDENT';
    static sortKeyPrefix = 'LOG';
    static dummyPrimaryKey = 'D';
    public static readonly  primaryKey = new PrimaryKey(ClassTable.PKName, Log.primaryKeyPrefix, 'PKD', Types.Str);
    public static readonly sortKey = new SortKey(ClassTable.SKName, Log.sortKeyPrefix, ['HITID', 'AssignmentID', 'WorkerID'], [Types.Str, Types.Str, Types.Str]);

    // @ts-ignore
    PKD: string; // Dummy placeholder key
    // @ts-ignore
    HITID: string;
    // @ts-ignore
    AssignmentID: string;
    // @ts-ignore
    WorkerID: string;
    // @ts-ignore
    Key: string;
    // @ts-ignore
    TimeOfSubmission: string;

    constructor(data: DynamoDB.DocumentClient.AttributeMap) {
        super();
        this.construct(data);
    }

    primaryKey(): PrimaryKey {
        return Log.primaryKey;
    }

    sortKey(): SortKey {
        return Log.sortKey;
    }

    get sortKeyPrefix(): string {
        return Log.sortKeyPrefix;
    }

    keyFileNamePair(): {
        key: string;
        fileName: string;
    } {
        const keyParts = this.Key.split('/');
        if (keyParts.length === 5) {
            const wustlKey = keyParts[0];
            const taskName = keyParts[3];
            const logFileName = keyParts[4];
            return {
                key: this.Key,
                fileName: wustlKey + '_' + taskName + '_' + logFileName,
            };
        }
        return {
            key: this.Key,
            fileName: this.Key,
        }
    }

    public static Create(hitID: string, assignmentID: string, workerID: string, key: string, time: string) {
        return new Log({
            PKMeta: this.primaryKey.toString(Log.dummyPrimaryKey),
            SKMeta: this.sortKey.toString({HITID: hitID, AssignmentID: assignmentID, WorkerID: workerID}),
            Key: key,
            TimeOfSubmission: time,
        });
    }

}