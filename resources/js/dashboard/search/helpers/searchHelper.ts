// Port từ dashboard/modules/search/helpers/searchHelper.js.
import { fetchContact } from 'dashboard/contacts/api';
import type { Contact } from 'dashboard/contacts/types';
import type { SearchFilterState } from '../types';

export const DATE_RANGE_TYPES = {
    LAST_7_DAYS: 'last_7_days',
    LAST_30_DAYS: 'last_30_days',
    LAST_60_DAYS: 'last_60_days',
    LAST_90_DAYS: 'last_90_days',
    CUSTOM: 'custom',
    BETWEEN: 'between',
} as const;

// Máy chủ kẹp mốc since về đúng số tháng này (SearchService::MESSAGE_LOOKBACK_MONTHS).
export const SEARCH_LOOKBACK_MONTHS = 12;

export const EMPTY_FILTERS: SearchFilterState = {
    from: null,
    in: null,
    dateRange: { type: null, from: null, to: null },
};

type URLQuery = Record<string, string | undefined>;

export function generateURLParams(
    { from, in: inboxId, dateRange }: Partial<SearchFilterState>,
    isAdvancedSearchEnabled = true,
): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    if (!isAdvancedSearchEnabled) return params;

    if (from) params.from = from;
    if (inboxId) params.inbox_id = inboxId;

    if (dateRange?.type) {
        params.range = dateRange.type;
        if (dateRange.from) params.since = dateRange.from;
        if (dateRange.to) params.until = dateRange.to;
    }

    return params;
}

export function parseURLParams(query: URLQuery, isAdvancedSearchEnabled = true): SearchFilterState {
    if (!isAdvancedSearchEnabled) {
        return { from: null, in: null, dateRange: { type: null, from: null, to: null } };
    }

    const { from, inbox_id: inboxId, since, until, range } = query;

    let type = range;
    if (!type && (since || until)) {
        type = DATE_RANGE_TYPES.BETWEEN;
    }

    return {
        from: from || null,
        in: inboxId ? Number(inboxId) : null,
        dateRange: {
            type: type ?? null,
            from: since ? Number(since) : null,
            to: until ? Number(until) : null,
        },
    };
}

export async function fetchContactDetails(accountId: number, contactId: number): Promise<Contact | null> {
    try {
        return await fetchContact(accountId, contactId);
    } catch {
        return null;
    }
}
