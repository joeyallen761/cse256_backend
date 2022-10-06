import {AuthenticationDetails, CognitoUser, CognitoUserPool, CognitoUserSession} from 'amazon-cognito-identity-js';
import { AwsClient } from 'aws4fetch';
import {AppJSONHeaders, BaseURL, METHODS, Region} from "./aws-constants";
import {createTable as dbCreateTable} from "./db";
import {fetchProjects, fetchSPIData} from "../redux/actions";
import {store} from "../redux/store";

const AWS = require("aws-sdk");

const IdentityPoolId = "us-east-1:b69d4b85-5cd8-4a07-aabf-e730ede479d9";
const ClientId = "15f397ambvh0db4i20usm454a0";
const UserPoolId = "us-east-1_B4YHaKqVR";

AWS.config.region = Region; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IdentityPoolId,
});

const userPool = new CognitoUserPool({
    UserPoolId: UserPoolId,
    ClientId: ClientId,
});

let cognitoUser: CognitoUser | null = userPool.getCurrentUser();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let sessionUserAttributes: CognitoUserSession | null | undefined = null;
let awsFetchClient: AwsClient | null = null;

const createCredentials = (result: CognitoUserSession) => {
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: IdentityPoolId,
        Logins: {
            [`cognito-idp.${Region}.amazonaws.com/${UserPoolId}`]: result.getIdToken().getJwtToken(),
        },
    });
}

const createFetchClient = () => {
    awsFetchClient = new AwsClient({
        secretAccessKey: AWS.config.credentials.secretAccessKey,
        accessKeyId: AWS.config.credentials.accessKeyId,
        sessionToken: AWS.config.credentials.sessionToken
    });
    return !AWS.config.credentials.expired;
}

const refreshCredentials = async () => {
    return await new Promise<boolean>((resolve, fail) => {
        AWS.config.credentials.refresh((error: any) => {
            if (error) {
                fail(error);
            }
            createFetchClient();
            resolve(true);
        });
    });
}

const createTable = () => {
    if (awsFetchClient === null) {
        throw new Error('AWS Fetch Client is null, cannot construct database connection.');
    }
    dbCreateTable(awsFetchClient as AwsClient);
}

const asyncStore = () => {
    store.dispatch(fetchProjects());
    store.dispatch(fetchSPIData());
}

const nullifyAllServiceGlobals = () => {
    cognitoUser = null;
    sessionUserAttributes = null;
    awsFetchClient = null;
}

const clearIncorrectUserdata = () => {
    cognitoUser = null;
    sessionUserAttributes = null;
}

export const awsLogin = async (username: string, password: string) => {
    if (username !== '' && password !== '') { // if username and password are given
        console.log(cognitoUser)
        if (cognitoUser === null) {
            cognitoUser = new CognitoUser({
                Username: username,
                Pool: userPool,
            });
        }
        const authenticationDetails = new AuthenticationDetails({
            Username: username,
            Password: password,
        });
        return await new Promise<boolean>((resolve, fail) => {

            cognitoUser?.authenticateUser(authenticationDetails, {
                onSuccess: async result => {
                    try {
                        createCredentials(result);
                        await refreshCredentials();
                        createTable();
                        asyncStore();
                        resolve(true);
                    } catch (e) {
                        clearIncorrectUserdata();
                        fail(e);
                    }
                },

                onFailure: err => {
                    clearIncorrectUserdata();
                    fail(err);
                },

                newPasswordRequired: (userAttributes, requiredAttributes) => {
                    return cognitoUser?.completeNewPasswordChallenge(password, requiredAttributes, {
                        onSuccess: session => {
                            sessionUserAttributes = session;
                            resolve(true);
                        },
                        onFailure: err => {
                            clearIncorrectUserdata();
                            fail(err);
                        }
                    });
                }
            });
        });
    } else {
        return await new Promise<boolean>((resolve, fail) => {
            if (cognitoUser !== null) {
                cognitoUser.getSession(async (err: any, result: any) => {
                    if (result) {
                        try {
                            createCredentials(result);
                            await refreshCredentials();
                            createTable();
                            asyncStore();
                            resolve(true);
                        } catch (e) {
                            clearIncorrectUserdata();
                            console.log(e)
                            fail(e);
                        }
                    } else {
                        clearIncorrectUserdata();
                        fail(err);
                    }
                });
            } else {
                clearIncorrectUserdata();
                fail("No user session.")
            }
        })
    }
}

export const awsLogout = async () => {
    if (cognitoUser) {
        return await new Promise<boolean>((resolve, fail) => {
            // @ts-ignore
            try {
                cognitoUser?.signOut();
                nullifyAllServiceGlobals();
                resolve(true);
            } catch (e) {
                nullifyAllServiceGlobals();
                fail(e);
            }
        });
    }
    return true;
}

export const downloadAllFiles = async (project: string, iteration: number) => {
    const url = BaseURL + `/logs?project=${project}&iteration=${iteration}`;
    const resp = (await (awsFetchClient as AwsClient).fetch(url, {
        method: METHODS.GET,
        headers: AppJSONHeaders()
    }));
    return resp.json();
}
