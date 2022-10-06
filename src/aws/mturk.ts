import AWS, {AWSError} from 'aws-sdk';
import {GetAccountBalanceResponse} from "aws-sdk/clients/mturk";
import {Region} from "./aws-constants";
import {Data, MTurkMode} from "../redux/actions";
import {PromiseResult} from "aws-sdk/lib/request";

type MTurkAccounts = { [wustlKey: string]: AWS.MTurk };
export type AccountPair = {wustlKey: string, balance: string};
export type TAccountBalances = AccountPair[];

type AWSTableError = {
    wustlKey: string,
    error: string,
    code: string,
    message: string,
};
class MTurkPool {
    private accts: MTurkAccounts = {};
    private sandboxAccts: MTurkAccounts = {};
    private realAccts: MTurkAccounts = {};
    private static HitConfig(url: string): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
                    <ExternalQuestion xmlns="http://mechanicalturk.amazonaws.com/AWSMechanicalTurkDataSchemas/2006-07-14/ExternalQuestion.xsd">
                        <ExternalURL>${url}</ExternalURL>
                        <FrameHeight>0</FrameHeight>
                    </ExternalQuestion>`;
    }

    add(wustlKey: string, accessID: string, accessSecret: string) {
        console.log("AccessID", accessID, "accessSecret",accessSecret)
        this.addRealAccount(wustlKey, new AWS.MTurk({
            region: Region,
            endpoint: 'https://mturk-requester.us-east-1.amazonaws.com',
            credentials: {
                accessKeyId: accessID,
                secretAccessKey: accessSecret
            }
        }));
        this.addSandboxAccount(wustlKey, new AWS.MTurk({
            region: Region,
            endpoint: 'https://mturk-requester-sandbox.us-east-1.amazonaws.com',
            credentials: {
                accessKeyId: accessID,
                secretAccessKey: accessSecret
            }
        }));
    }

    addRealAccount(wustlKey: string, acct: AWS.MTurk) {
        this.realAccts[wustlKey] = acct;
    }

    addSandboxAccount(wustlKey: string, acct: AWS.MTurk) {
        this.sandboxAccts[wustlKey] = acct;
    }

    private setSandbox(sandbox: MTurkMode) {
        if (sandbox === MTurkMode.SANDBOX) {
            this.accts = this.sandboxAccts;
        } else {
            this.accts = this.realAccts;
        }
    }

    private forp<E>(fun: (wustlKey: string, acct: AWS.MTurk) => E): E[] {
        return Object.keys(this.accts).map(key => {
            return fun(key, this.accts[key]);
        });
    }

    async getAccountBalance(wustlKey: string, acct: AWS.MTurk) {
        return new Promise<AccountPair>((resolve, reject) => {
            acct.getAccountBalance((err: AWSError, data: GetAccountBalanceResponse) => {
                if (err) {
                    resolve({wustlKey: wustlKey, balance: "Not Available."});
                } else {
                    resolve({wustlKey: wustlKey, balance: data.AvailableBalance ? data.AvailableBalance : "Not Available."});
                }
            });
        });
    }

    async getAccountBalances(sandbox: MTurkMode) {
        this.setSandbox(sandbox);
        return this.forp(async (wustlKey, acct) => {
            return this.getAccountBalance(wustlKey, acct);
        });
    }

    async uploadHit() {

    }

    async uploadHits(urls: {[wustlKey: string]: {count: number, url: string, price: string}[]}, sandbox: MTurkMode, projectName: string) {
        this.setSandbox(sandbox);
        const name: string = ({
            'information-foraging': 'Information Foraging WUSTL',
            'gender-mag': 'File Permissions WUSTL'
        } as {[projectName: string]: string})[projectName];
        const description: string = ({
            'information-foraging': 'You will be given a scenario for a website user. Please navigate through the website to find the answer - your path is tracked as you work. When you are on the page with the answer, fill out the text box in the drop down at the top of the page and click submit. Correct answers will receive bonuses of up to $.25.',
            'gender-mag': 'Use the given scenario to adjust the Windows style file permissions. It is fine if you do not complete the task, please provide feedback both good and bad. Excellent work can earn bonuses up to 0.30.'
        } as {[projectName: string]: string})[projectName];
        const quals = await MTPool.createAndGetDisqualifiers(sandbox, projectName);
        return this.forp(async (wustlKey, acct) => {
            return new Promise<AccountPair | AWSTableError>((resolve, reject) => {
                const urlsForStud = urls[wustlKey];
                const qual = quals[wustlKey];
                if (qual && urlsForStud) {
                    urlsForStud.forEach(async urlCountPair => {
                        console.log(wustlKey + ' ' + urlCountPair.url + ' ' + urlCountPair.count);
                        if (urlCountPair.count > 0) {
                            acct.createHIT({ // TODO: fix this to be generalizable config
                                    AssignmentDurationInSeconds: 360,
                                    AutoApprovalDelayInSeconds: 2592000,
                                    Description: description,
                                    LifetimeInSeconds: (60 * 60 * 20), // 20 hours
                                    MaxAssignments: urlCountPair.count,
                                    Reward: urlCountPair.price,
                                    Title: name,
                                    Question: MTurkPool.HitConfig(urlCountPair.url),
                                    QualificationRequirements: [
                                        {
                                            ActionsGuarded: "DiscoverPreviewAndAccept",
                                            Comparator: "DoesNotExist",
                                            QualificationTypeId: qual,
                                        },
                                    ]
                                },
                                async (err, data) => {
                                    if (err) {
                                        console.log("ERROR: " + err);
                                        resolve({
                                            wustlKey: wustlKey,
                                            error: err.name,
                                            code: err.code,
                                            message: err.message
                                        });
                                    } else {
                                        console.log("DATA: " + data);
                                        resolve({
                                            wustlKey: wustlKey,
                                            balance: (await acct.getAccountBalance().promise()).AvailableBalance as string,
                                        });
                                    }
                            });
                        }
                    });
                }
            });
        });
    }

    async cancelHits(sandbox: MTurkMode) {
        this.setSandbox(sandbox);
        const promises = this.forp(async (wustlKey, acct) => {
            return new Promise<AccountPair>(async (resolve, reject) => {
                console.log(wustlKey);
                let allHits: any[] = [];
                let nextToken = undefined;
                let hits;
                do {
                    hits = await acct.listHITs({NextToken: nextToken}).promise();
                    console.log(hits);
                    if (hits.HITs) {
                        allHits.push(...hits.HITs);
                        nextToken = hits.NextToken;
                        console.log(nextToken)
                    }
                } while(nextToken !== undefined);
                let nDate = new Date();
                nDate.setMilliseconds(new Date().getMilliseconds() - 1000);
                for (const hit of allHits) {
                    if (hit.Expiration && hit.Expiration > new Date().getMilliseconds()) {
                        const resp = await acct.updateExpirationForHIT({
                            ExpireAt: nDate,
                            HITId: hit.HITId as string
                        }).promise();
                        console.log(resp.$response.error + " " + resp.$response.httpResponse);
                    }
                }
                resolve();
            });
        });
        for (let i = 0; i < promises.length; i++) {
            await promises[i];
        }
    }

    async payHits(data: Data, sandbox: MTurkMode) {
        this.setSandbox(sandbox);
        for (let i = 0; i < data.values.length; i++) {
            const row = data.values[i];
            const acct = this.accts[row[0]];
            let resp;
            try {
                if (acct != undefined) {
                    switch (row[3]) {
                        case 'approve':
                            resp = await acct.approveAssignment({
                                AssignmentId: row[2],
                            }).promise();
                            console.log(resp.$response);
                            break;
                        case 'reject':
                            resp = await acct.rejectAssignment({
                                AssignmentId: row[2],
                                RequesterFeedback: 'The log of your actions on the website and the written response did not show substantial effort in completing this task and therefore do not warrant payment.'
                            }).promise();
                            console.log(resp.$response);
                            break;
                        case 'bonus':
                            resp = await acct.approveAssignment({
                                AssignmentId: row[2],
                            }).promise();
                            console.log(resp.$response);
                            resp = await acct.sendBonus({
                                AssignmentId: row[2],
                                WorkerId: row[1],
                                BonusAmount: '0.10',
                                Reason: 'Your work showed an honest effort to complete the task and you either found the correct answer or put in strong logical thought in your actions. Thank your for your time, and we hope this bonus makes the HIT feel more worthwhile.',
                                UniqueRequestToken: row[2]
                            }).promise();
                            console.log(resp.$response);
                            break;
                        default:
                            console.log(row);
                            console.log('^^ the above row did not contain a valid action ^^');
                            break;
                    }
                } else {
                    console.log(row);
                    console.log('^^ row was undefined ^^');
                }
            } catch (e) {
                console.log(e);
            }
        }
    }

    async getStatuses(sandbox: MTurkMode) {
        this.setSandbox(sandbox);
        let data = new Data(['WUSTL Key', 'Awaiting Acceptance', 'In Progress', 'Completed'], []);
        let promises = this.forp(async (key: string, acct: AWS.MTurk) => {
            let entry = [key, 0, 0, 0];
            const hits = (await acct.listHITs().promise()).HITs;
            if (hits && hits.length > 0) {
                const as = hits.map(hit => hit.MaxAssignments ? hit.MaxAssignments : 0).reduce((prev: number, cur: number) => prev + cur, 0);
                hits.forEach(hit => {
                    const available = hit.NumberOfAssignmentsAvailable ? hit.NumberOfAssignmentsAvailable : 0;
                    const pending = hit.NumberOfAssignmentsPending ? hit.NumberOfAssignmentsPending : 0;
                    let completed = hit.MaxAssignments ? hit.MaxAssignments : 0;
                    completed -= (available + pending);
                    completed = Math.max(completed, 0);
                    switch (hit.HITStatus) {
                        case "Assignable":
                            (entry[1] as number) += available;
                            break;
                        case "Unassignable":
                            (entry[2] as number) += pending;
                            break;
                        case "Reviewable":
                            (entry[3] as number) += completed;
                            break;
                        default:
                            break;
                    }
                });
            }
            let sEntry = entry.map(item => item + '');
            data.values.push(sEntry);
            return true;
        });
        if (promises) {
            for (let promise of promises) {
                await promise;
            }
        }
        data.values.sort((a, b) => -(parseInt(a[0]) + parseInt(a[1])) + (parseInt(b[0]) + parseInt(b[1])));
        return data;
    }

    async createAndGetDisqualifiers(sandbox: MTurkMode, project: string) {
        this.setSandbox(sandbox);
        const ret: {[wustlKey: string]: string} = {};
        const promises = this.forp(async (key, acct) => {
           let quals = await (acct.listQualificationTypes({MustBeRequestable: false, MustBeOwnedByCaller: true}).promise());
           let id = '';
           quals.QualificationTypes?.forEach(qual => {
              if (qual.Name === project && qual.QualificationTypeId) {
                  id = qual.QualificationTypeId;
              }
           });
           if (id === '') {
               try {
                   const qual = await (acct.createQualificationType({
                       Name: project,
                       Description: 'This qualification is applied to anyone who has completed an information foraging task from the WUSTL Nursery School HITs.',
                       AutoGranted: true,
                       QualificationTypeStatus: 'Active',
                       AutoGrantedValue: 0,
                   }).promise());
                   if (qual.QualificationType?.QualificationTypeId) {
                       id = qual.QualificationType.QualificationTypeId;
                   }
               } catch (e) {
                   console.log(e);
               }
           }
           ret[key] = id;
        });
        for (const p of promises) {
            await p;
        }
        return ret;
    }

    async workersWithQualID(acct: AWS.MTurk, id: string) {
        let nextToken: string | undefined | null = undefined;
        let ids: string[] = [];
        do {
            try {
                const resp: PromiseResult<AWS.MTurk.ListWorkersWithQualificationTypeResponse, AWS.AWSError> = await (acct.listWorkersWithQualificationType({
                    QualificationTypeId: id,
                    NextToken: nextToken,
                    MaxResults: 100,
                }).promise());
                nextToken = resp.NextToken;
                resp.Qualifications?.forEach(qual => {
                    ids.push(qual.WorkerId as string);
                });
            } catch (e) {
                console.log(e);
                return ids;
            }
        }
        while(nextToken !== '' && nextToken !== null && nextToken !== undefined);
        return ids;
    }

    async disqualify(sandbox: MTurkMode, project: string, workerIDs: Set<string>) {
        this.setSandbox(sandbox);
        const quals = await this.createAndGetDisqualifiers(sandbox, project);
        const ids = Array.from(workerIDs);
        console.log('Project: ' + project + ', so far has: ' + ids.length + ' workers listed as completing a HIT.');
        const keys = Object.keys(this.accts);
        for (const key of keys) {
            const acct = this.accts[key];
            const qualID = quals[key];
            if (acct && qualID) {
                for (const id of ids) {
                    try {
                        const resp = await (acct.associateQualificationWithWorker({
                            IntegerValue: 1,
                            QualificationTypeId: qualID,
                            SendNotification: false,
                            WorkerId: id,
                        }).promise());
                        // console.log(resp.$response)
                    } catch (e) {
                        console.log('ERROR: ' + e.toString());
                    }
                }
            }
            const wis = await this.workersWithQualID(acct, qualID);
            console.log('\t Student: ' + key + ', has: ' + wis.length + ' workers disqualified for this project so far.');
        }
    }
}

const MTPool = new MTurkPool();

export default MTPool;
