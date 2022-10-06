import {
    Data,
    EDBStatus,
    LOGIN,
    LoginStatus,
    LOGOUT,
    MTurkMode,
    RootState,
    SPIData,
    Student, SubmitHITData,
    SubmitHITDataType,
    UPDATE_BALANCES,
    UPDATE_CURRENT_ITERATION,
    UPDATE_CURRENT_PROJECT,
    UPDATE_DB_STATUS,
    UPDATE_ITERATIONS,
    UPDATE_MTURK_MODE,
    UPDATE_PROJECTS,
    UPDATE_SPI_DATA,
    UPDATE_STUDENTS, UPDATE_SUBMIT_HIT_DATA
} from "./actions";
import {ProjectDescription} from "../aws/db";
import {TAccountBalances} from "../aws/mturk";

// const defaultState: RootState = {
//     loggedIn: false,
//     dbStatus: EDBStatus.Unknown,
//     projects: ['project 1', 'project 2', 'project 3'],
//     iterations: 3,
//     currentProject: 'project 1',
//     currentIteration: 0,
//     spiData: {'riley.mccuen': {project1: [{name1: 'math', name2: 'birthdays', name3: 'treats', count1: 2, count2: 2, count3: 3}]}},
//     students: [{wustlKey: 'riley.mccuen', id: '', secret: ''}]
// };

const defaultState: RootState = {
    loggedIn: LoginStatus.UNATTEMPTED,
    dbStatus: EDBStatus.Unknown,
    projects: [],
    iterations: 5,
    currentProject: ProjectDescription.Create('', ''),
    currentIteration: 0,
    spiData: null,
    students: [],
    accountBalances: [],
    submitHITData: {dataType: SubmitHITDataType.COUNT_NOT_GIVEN, data: new Data([], [])},
    mturkMode: MTurkMode.SANDBOX,
};

export function rootReducer(state=defaultState, action: any){
    const reducerHelper = (updates: object) => {
        return Object.assign({}, state, updates);
    };
    switch(action.type) {
        case LOGIN:
            const lin = action as {loggedIn: LoginStatus};
            return reducerHelper({
                loggedIn: lin.loggedIn
            });
        case LOGOUT:
            const lout = action as {loggedIn: LoginStatus};
            return reducerHelper({
                loggedIn: lout.loggedIn
            });
        case UPDATE_DB_STATUS:
            const udbs = action as {dbStatus: EDBStatus};
            return reducerHelper({
                dbStatus: udbs.dbStatus
            });
        case UPDATE_PROJECTS:
            const up = action as {projects: string[], currentProject: string};
            return reducerHelper({
                projects: up.projects,
                currentProject: up.currentProject
            });
        case UPDATE_ITERATIONS:
            const ui = action as {iterations: number, iteration: number};
            return reducerHelper({
                iterations: ui.iterations,
                currentIteration: ui.iteration
            });
        case UPDATE_CURRENT_PROJECT:
            const ucp = action as {currentProject: string};
            return reducerHelper({
                currentProject: ucp.currentProject
            });
        case UPDATE_CURRENT_ITERATION:
            const uci = action as {currentIteration: number};
            return reducerHelper({
                currentIteration: uci.currentIteration
            });
        case UPDATE_SPI_DATA:
            const uspid = action as {spiData: SPIData};
            return reducerHelper({
                spiData: uspid.spiData
            });
        case UPDATE_STUDENTS:
            const us = action as {students: Student[]};
            return reducerHelper({
                students: us.students
            });
        case UPDATE_BALANCES:
            const ub = action as {accountBalances: TAccountBalances};
            return reducerHelper({
                accountBalances: ub.accountBalances,
            });
        case UPDATE_SUBMIT_HIT_DATA:
            const ushd = action as {submitHITData: SubmitHITData};
            console.log(ushd)
            return reducerHelper({
                submitHITData: ushd.submitHITData,
            });
        case UPDATE_MTURK_MODE:
            const umm = action as {mturkMode: MTurkMode};
            return reducerHelper({
                mturkMode: umm.mturkMode
            });
        default:
            return state;
    }
}

