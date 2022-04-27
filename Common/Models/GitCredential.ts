import BaseModel from './BaseModel';
import User from './User';
import Project from './Project';
export default interface Model extends BaseModel{
    {
        gitUsername: string,
        gitPassword: string,
        sshTitle: string,
        sshPrivateKey: string,
        iv: Schema.Types.Buffer,
        project: {
            type: Schema.Types.ObjectId,
            ref: 'Project',
            index: true,
        },
        deleted: boolean,
        deletedAt: Date,
    },
    { timestamps: true }
);








