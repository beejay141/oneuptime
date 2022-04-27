import BaseModel from './BaseModel';
import User from './User';
import Project from './Project';
export default interface Model extends BaseModel{
    project: {
        type: string,
        ref: 'Project',
        alias: 'project',
        index: true,
    },
    name: string,
    teams: [{ type: string, ref: 'User', default: null }],
    createdByUser: {
        type: string,
        ref: 'User',
        index: true,
    },
    ,
    deleted: boolean,

    deletedByUser: {
        type: string,
        ref: 'User',
        index: true,
    },
}








