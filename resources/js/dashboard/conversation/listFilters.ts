import { SORT_BY_TYPE, STATUS_TYPE } from './constants';
import type { ConversationStatusFilter } from './types';

// Bộ lọc cơ bản của danh sách hội thoại. Kênh + nhãn sống trên query string
// (`?inbox=5&label=a&label=b`) để link chia sẻ được và ghép được với nhau;
// trạng thái + sắp xếp nhớ theo người dùng ở `ui_settings.conversations_filter_by`.
export interface ConversationListFilters {
    inboxIds: number[];
    labels: string[];
    status: ConversationStatusFilter;
    sortBy: string;
}

export type ListFilterQuery = Pick<ConversationListFilters, 'inboxIds' | 'labels'>;

export type PersistedListFilters = Pick<ConversationListFilters, 'status' | 'sortBy'>;

export const INBOX_FILTER_PARAM = 'inbox';
export const LABEL_FILTER_PARAM = 'label';

// API danh sách nhận đúng một `inbox_id`; chọn nhiều kênh cần mở rộng lõi API trước.
export const MAX_INBOX_FILTERS = 1;

export const DEFAULT_LIST_STATUS: ConversationStatusFilter = STATUS_TYPE.OPEN;
export const DEFAULT_LIST_SORT: string = SORT_BY_TYPE.LAST_ACTIVITY_AT_DESC;

export const EMPTY_LIST_FILTER_QUERY: ListFilterQuery = { inboxIds: [], labels: [] };

const STATUS_VALUES: string[] = Object.values(STATUS_TYPE);
const SORT_VALUES: string[] = Object.values(SORT_BY_TYPE);

function uniqueInOrder<T>(values: T[]): T[] {
    return [...new Set(values)];
}

function normalizeInboxIds(values: Array<number | string>): number[] {
    const ids = values
        .map(value => Number(value))
        .filter(id => Number.isInteger(id) && id > 0);

    return uniqueInOrder(ids).slice(0, MAX_INBOX_FILTERS);
}

function normalizeLabels(values: string[]): string[] {
    return uniqueInOrder(values.map(label => label.trim()).filter(Boolean));
}

export function normalizeListFilterQuery(query: Partial<ListFilterQuery>): ListFilterQuery {
    return {
        inboxIds: normalizeInboxIds(query.inboxIds ?? []),
        labels: normalizeLabels(query.labels ?? []),
    };
}

export function readListFilterQuery(search: string): ListFilterQuery {
    const params = new URLSearchParams(search);

    return {
        inboxIds: normalizeInboxIds(params.getAll(INBOX_FILTER_PARAM)),
        labels: normalizeLabels(params.getAll(LABEL_FILTER_PARAM)),
    };
}

// `pathAndSearch` là pathname + search; chỉ thay khoá kênh/nhãn, giữ nguyên các khoá
// khác (`q`, `messageId`…). Tự dựng chuỗi để nhãn lặp khoá `label=a&label=b`.
export function withListFilterQuery(pathAndSearch: string, query: Partial<ListFilterQuery>): string {
    const url = new URL(pathAndSearch, 'http://local');
    const { inboxIds, labels } = normalizeListFilterQuery(query);

    url.searchParams.delete(INBOX_FILTER_PARAM);
    url.searchParams.delete(LABEL_FILTER_PARAM);
    inboxIds.forEach(id => url.searchParams.append(INBOX_FILTER_PARAM, String(id)));
    labels.forEach(label => url.searchParams.append(LABEL_FILTER_PARAM, label));

    return `${url.pathname}${url.search}`;
}

export function hasListFilterQuery(query: ListFilterQuery): boolean {
    return query.inboxIds.length > 0 || query.labels.length > 0;
}

export function readPersistedListFilters(settings: { status?: unknown; order_by?: unknown } | undefined): PersistedListFilters {
    const status = String(settings?.status ?? '');
    const sortBy = String(settings?.order_by ?? '');

    return {
        status: STATUS_VALUES.includes(status) ? (status as ConversationStatusFilter) : DEFAULT_LIST_STATUS,
        sortBy: SORT_VALUES.includes(sortBy) ? sortBy : DEFAULT_LIST_SORT,
    };
}

// Số bộ lọc đang thu hẹp danh sách: mỗi kênh, mỗi nhãn, trạng thái khác mặc định.
// Sắp xếp không thu hẹp danh sách nên không tính.
export function countActiveListFilters(filters: ConversationListFilters): number {
    return filters.inboxIds.length + filters.labels.length + (filters.status === DEFAULT_LIST_STATUS ? 0 : 1);
}
