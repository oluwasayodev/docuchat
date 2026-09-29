import {PageSort, SortOrder, SortRequest} from "../types/pagination.type";


export interface ResolvedSort {
    orderBy: Record<string, SortOrder>;
    sort: PageSort
}

export const resolveSort = <TField extends string>(
    sortable: readonly TField[],
    defaultField: TField,
    defaultDirection: SortOrder = "desc",
    request: SortRequest<TField> = {}
): ResolvedSort => {
    const field = request.sortBy && sortable.includes(request.sortBy)
    ? request.sortBy
        : defaultField;

    const direction = request.sortOrder ?? defaultDirection;

    return {
        orderBy: {[field]: direction},
        sort: {field, direction},
    }
}