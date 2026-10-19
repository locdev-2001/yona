import { SORT_BY_TYPE, STATUS_TYPE } from '../constants';
import { DEFAULT_LIST_STATUS, MAX_INBOX_FILTERS, narrowsByStatus } from '../listFilters';
import type { ConversationListFilters } from '../listFilters';
import type { ConversationStatusFilter } from '../types';

// Lựa chọn của bảng Lọc nhanh. Bảng và hàng chip đang bật cùng đọc từ đây để
// thứ tự, nhãn và cách bỏ một bộ lọc chỉ sửa ở một chỗ.

export const QUICK_STATUS_VALUES: ConversationStatusFilter[] = [
    STATUS_TYPE.OPEN,
    STATUS_TYPE.PENDING,
    STATUS_TYPE.SNOOZED,
    STATUS_TYPE.RESOLVED,
    STATUS_TYPE.ALL,
];

export const QUICK_SORT_VALUES: string[] = [
    SORT_BY_TYPE.LAST_ACTIVITY_AT_DESC,
    SORT_BY_TYPE.WAITING_SINCE_ASC,
    SORT_BY_TYPE.UNREAD,
];

export function statusLabelKey(status: ConversationStatusFilter): string {
    return `CHAT_LIST.FILTER_PANEL.STATUS_ITEMS.${status}`;
}

// Kiểu sắp xếp đã lưu từ trước (ngoài ba kiểu nhanh) vẫn chạy và hiện tên đầy đủ.
export function sortLabelKey(sortBy: string): string {
    return QUICK_SORT_VALUES.includes(sortBy)
        ? `CHAT_LIST.FILTER_PANEL.SORT_ITEMS.${sortBy}`
        : `CHAT_LIST.SORT_ORDER_ITEMS.${sortBy}.TEXT`;
}

export function sortValuesFor(sortBy: string): string[] {
    return QUICK_SORT_VALUES.includes(sortBy) ? QUICK_SORT_VALUES : [...QUICK_SORT_VALUES, sortBy];
}

// Kênh chọn một: bấm kênh đang chọn là bỏ, bấm kênh khác là thay.
export function toggledInboxIds(current: number[], inboxId: number): number[] {
    if (current.includes(inboxId)) return current.filter(id => id !== inboxId);

    return [...current, inboxId].slice(-MAX_INBOX_FILTERS);
}

export function toggledLabels(current: string[], title: string): string[] {
    return current.includes(title) ? current.filter(label => label !== title) : [...current, title];
}

export const CLEARED_LIST_FILTERS: Partial<ConversationListFilters> = {
    inboxIds: [],
    labels: [],
    status: DEFAULT_LIST_STATUS,
};

export interface ActiveFilterChip {
    key: string;
    kind: 'inbox' | 'label' | 'status';
    inboxId?: number;
    label?: string;
    status?: ConversationStatusFilter;
    removal: Partial<ConversationListFilters>;
}

// Bộ lọc đang thu hẹp danh sách, theo thứ tự kênh → nhãn → trạng thái.
// Trạng thái mặc định (Đang mở) và trạng thái khi ẩn trạng thái hội thoại không thành chip; sắp xếp không thu hẹp nên không có chip.
export function activeFilterChips(filters: ConversationListFilters): ActiveFilterChip[] {
    const inboxChips = filters.inboxIds.map<ActiveFilterChip>(inboxId => ({
        key: `inbox:${inboxId}`,
        kind: 'inbox',
        inboxId,
        removal: { inboxIds: filters.inboxIds.filter(id => id !== inboxId) },
    }));
    const labelChips = filters.labels.map<ActiveFilterChip>(label => ({
        key: `label:${label}`,
        kind: 'label',
        label,
        removal: { labels: filters.labels.filter(title => title !== label) },
    }));
    const statusChips: ActiveFilterChip[] = narrowsByStatus(filters.status)
        ? [{ key: `status:${filters.status}`, kind: 'status', status: filters.status, removal: { status: DEFAULT_LIST_STATUS } }]
        : [];

    return [...inboxChips, ...labelChips, ...statusChips];
}
