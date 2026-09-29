

export type SortOrder = "asc" | "desc";

export interface PageRequest {
    page?: number;
    limit?: number;
}

export interface SortRequest<TField extends string = string> {
    sortBy?: TField;
    sortOrder?: SortOrder;
}

export type PaginatedQuery<TField extends string = string> = PageRequest & SortRequest<TField>;

export interface PageSort {
    field: string;
    direction: SortOrder;
}

export interface PageLinks {
    first: number;
    last: number;
    prev: number | null;
    next: number | null;
}


export interface PageMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    numberOfElements: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    firstPage: number;
    lastPage: number;
    prevPage: number | null;
    nextPage: number | null;
    sort: PageSort | null;
    links: PageLinks;
}

export interface Page<T> {
    items: T[];
    meta: PageMeta;
}