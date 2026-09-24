import {Exclude, Expose, Transform} from "class-transformer";


export class UserResponse {

    @Expose() id!: string;
    @Expose() email!: string;
    @Expose() name!: string;
    @Expose() createdAt!: Date;

    @Expose()
    roles?: string[];






}