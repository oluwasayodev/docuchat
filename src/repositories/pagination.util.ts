import {Page, PageMeta, PageRequest, PageSort} from "../types/pagination.type";


export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;


export interface ResolvedPage {

    page: number;
    limit: number;
    skip: number;
    take: number;
}


export const resolvePage = (request: PageRequest = {}): ResolvedPage => {
    const page = Math.max(1, Math.trunc(request.page ?? DEFAULT_PAGE));
    const limit = Math.min(MAX_LIMIT, Math.trunc(request.limit ?? DEFAULT_LIMIT));
    return {page, limit, skip: (page - 1) * limit, take: limit}
}


export const buildPage = <T>(
    items: T[],
    total: number,
    resolved: ResolvedPage,
    sort: PageSort | null = null
): Page<T> => {
    const totalPages = total === 0 ? 0 : Math.ceil(total / resolved.limit);
    const hasNextPage = resolved.page < totalPages;
    const hasPrevPage = resolved.page > 1;
    const prevPage = hasPrevPage ? resolved.page - 1 : null;
    const nextPage = hasNextPage ? resolved.page + 1 : null;

    const meta: PageMeta = {
        page: resolved.page,
        limit: resolved.limit,
        total,
        totalPages,
        numberOfElements: items.length,
        hasNextPage,
        hasPrevPage,
        firstPage: 1,
        lastPage: totalPages,
        prevPage,
        nextPage,
        sort,
        links: {first: 1, last: totalPages, prev: prevPage, next: nextPage},
    }

    return {items, meta}
}