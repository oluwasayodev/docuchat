import {Exclude, Expose, Transform} from "class-transformer";


export class UserResponse {

    @Expose() id!: string;
    @Expose() email!: string;
    @Expose() name!: string;
    @Expose() createdAt!: Date;

    @Exclude({toPlainOnly: true})
    role?: {name: string} | null;

    @Expose()
    get roleName(): string | null {
        return this.role?.name ?? null;
    }





}