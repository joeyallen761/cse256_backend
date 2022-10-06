import {table, ClassTable, ProjectDescription, Task} from "../aws/db";
import MTPool, {TAccountBalances} from "../aws/mturk";
import {store} from "./store";
import {Parser} from "papaparse";

export enum EDBStatus {
    Unknown,
    Created,
    DoesNotExist,
}

// action types
export const LOGIN = 'LOGIN';
export const LOGOUT = 'LOGOUT';
export const UPDATE_DB_STATUS = 'UPDATE_DB_STATUS';
export const UPDATE_PROJECTS = 'UPDATE_PROJECTS';
export const UPDATE_ITERATIONS = 'UPDATE_ITERATIONS';
export const UPDATE_CURRENT_PROJECT = 'UPDATE_CURRENT_PROJECT';
export const UPDATE_CURRENT_ITERATION = 'UPDATE_CURRENT_ITERATION';
export const UPDATE_SPI_DATA = 'UPDATE_SPI_DATA';
export const UPDATE_STUDENTS = 'UPDATE_STUDENTS';
export const UPDATE_BALANCES = 'UPDATE_BALANCES';
export const UPDATE_SUBMIT_HIT_DATA = 'UPDATE_SUBMIT_HIT_DATA';
export const UPDATE_MTURK_MODE = 'UPDATE_MTURK_MODE';

export enum SubmitHITDataType {
    COUNT_GIVEN,
    COUNT_NOT_GIVEN,
}

export class Data {
    header: string[];
    values: string[][];

    constructor(header: string[], values: string[][]) {
        this.header = header;
        this.values = values;
    }

    indexOfHeader(key: string) {
        return this.header.indexOf(key);
    }

    findFirstEntry(query: {index: number, expectedValue: string}[]) {
        const ret = this.values.find(row => {
            return query.every(queryTerm => {
                if (row[queryTerm.index] === queryTerm.expectedValue) {
                    return true;
                }
                return false;
            });
        });
        return ret;
    }

    resetValues() {
        this.values = [];
        return this;
    }
}

export interface SubmitHITData {
    dataType: SubmitHITDataType,
    data: Data,
}

export interface StudentProjectIterationTask {
    name: string;
    count: number;
}

export interface StudentProjectIteration {
    tasks: StudentProjectIterationTask[];
}

export interface SPIData {
    [wustlKey: string]: {
        [projectName: string]: StudentProjectIteration[]
    };
}

export interface Student {
    url: string;
    wustlKey: string;
    id: string;
    secret: string;
}

export enum LoginStatus {
    UNATTEMPTED,
    FAILED,
    SUCCEEDED
}

export interface Tasks {
    [projectName: string]: Task[]
}

export enum MTurkMode {
    SANDBOX,
    REAL
}

export interface RootState {
    loggedIn: LoginStatus;
    dbStatus: EDBStatus;
    projects: ProjectDescription[];
    iterations: number;
    currentProject: ProjectDescription;
    currentIteration: number;
    spiData: null | SPIData;
    students: Student[];
    accountBalances: TAccountBalances;
    submitHITData: SubmitHITData,
    mturkMode: MTurkMode;
}

export const login = () => {
    return {
        type: LOGIN,
        loggedIn: LoginStatus.SUCCEEDED
    };
}

export const logout = () => {
    return {
        type: LOGOUT,
        loggedIn: LoginStatus.FAILED
    };
}

export const updateDBStatus = (dbStatus: EDBStatus) => {
    return {
        type: UPDATE_DB_STATUS,
        dbStatus
    };
}

export const updateProjects = (projects: ProjectDescription[]) => {
    const sortedProjects = projects.sort((a, b) => a.Name < b.Name ? -1 : 1);
    return {
        type: UPDATE_PROJECTS,
        projects: sortedProjects,
        currentProject: sortedProjects[0] ? sortedProjects[0] : ProjectDescription.Create('No Projects Yet', '')
    }
}

export const updateIterations = (iterations: number) => {
    return {
        type: UPDATE_ITERATIONS,
        iterations,
        iteration: 0
    }
}

export const updateCurrentProject = (currentProject: ProjectDescription) => {
    return {
        type: UPDATE_CURRENT_PROJECT,
        currentProject
    };
}

export const updateCurrentIteration = (currentIteration: number) => {
    return {
        type: UPDATE_CURRENT_ITERATION,
        currentIteration
    };
}

export const updateSPIData = (spiData: SPIData) => {
    return {
        type: UPDATE_SPI_DATA,
        spiData
    }
}

export const updateStudents = (students: Student[]) => {
    students.forEach(stud => {
        MTPool.add(stud.wustlKey, stud.id, stud.secret);
    });
    return {
        type: UPDATE_STUDENTS,
        students
    }
}

export const updateBalances = (accountBalances: TAccountBalances) => {
    return {
        type: UPDATE_BALANCES,
        accountBalances
    };
}

export const updateSubmitHITData = (submitHITData: SubmitHITData) => {
    return {
        type: UPDATE_SUBMIT_HIT_DATA,
        submitHITData
    }
}

export const updateMTurkMode = (mturkMode: MTurkMode) => {
    return {
        type: UPDATE_MTURK_MODE,
        mturkMode
    }
}

export const fetchProjects = () => {
    return async (dispatch: any) => {
        try {
            const projects = (await (table as ClassTable).getProjectNames());
            console.log(projects)
            dispatch(updateProjects(projects));
        } catch (e) {console.log(e);}
    }
}

export const fetchSPIData = () => {
    return async (dispatch: any) => {
        try {
            dispatch(updateSPIData({}));
        } catch (e) {console.log(e);}
    }
}

export const fetchAccountBalances = (sandbox: MTurkMode) => {
    return async(dispatch: any) => {
        try {
            const balances = await Promise.all(await MTPool.getAccountBalances(sandbox));
            console.log(balances)
            dispatch(updateBalances(balances));
        } catch (e) {console.log(e);}
    }
}
