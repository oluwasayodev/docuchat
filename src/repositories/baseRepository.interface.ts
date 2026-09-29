export interface IBaseRepository<T, ID> {
    findById(id: ID): Promise<T | null>;
    findAll(): Promise<T[]>;
    create(data: Partial<T>): Promise<T>;
    update(id: ID, data: Partial<T>): Promise<T>;
    delete(id: ID): Promise<boolean>;
}