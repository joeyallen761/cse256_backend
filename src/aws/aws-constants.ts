export const Region = 'us-east-1';
export const BaseURL = process.env.REACT_APP_BASE_URL;
export const TableName = process.env.REACT_APP_TABLE_NAME;

export enum METHODS {
    GET= 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE'
}

export const AppJSONHeaders = () => {
    return {
        'Content-Type': 'application/json'
    }
}