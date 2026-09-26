import {Exclude, Expose, Transform} from "class-transformer";


export class UserResponse {

    @Expose() id!: string;
    @Expose() email!: string;
    @Expose() name!: string;
    @Expose() createdAt!: Date;

    @Expose()
    @Transform(({value}) =>
        Array.isArray(value)
            ? value.map((item: any) => (typeof item === "string" ? item: item?.role?.name)).filter(Boolean)
            : [value]
    )
    roles?: string[];

}