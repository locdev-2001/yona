import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
    searchContacts: vi.fn(),
    searchConversations: vi.fn(),
    searchMessages: vi.fn(),
    searchArticles: vi.fn(),
}));

const api = await import('./api');
const { clearSearchResults, fullSearch, getSearchState, searchByKind, PER_PAGE } = await import('./store');

// Port hành vi của store/modules/conversationSearch.js (Chatwoot không có spec
// riêng) — hai bất biến ghi trong comment nguồn: khử trùng khi trang chồng lấn,
// và hasMore đọc từ kích thước trang thô.
const contact = (id: number) => ({ id, name: `contact-${id}` }) as never;

beforeEach(() => {
    vi.resetAllMocks();
    clearSearchResults();
    vi.mocked(api.searchContacts).mockResolvedValue([]);
    vi.mocked(api.searchConversations).mockResolvedValue([]);
    vi.mocked(api.searchMessages).mockResolvedValue([]);
    vi.mocked(api.searchArticles).mockResolvedValue([]);
});

describe('searchByKind', () => {
    it('drops records already present when pages overlap', async () => {
        vi.mocked(api.searchContacts)
            .mockResolvedValueOnce([contact(1), contact(2)])
            .mockResolvedValueOnce([contact(2), contact(3)]);

        await searchByKind('contacts', 1, { q: 'a', page: 1 });
        await searchByKind('contacts', 1, { q: 'a', page: 2 });

        expect(getSearchState().contactRecords.map(record => record.id)).toEqual([1, 2, 3]);
    });

    it('sets hasMore from the raw page size, not the deduped record count', async () => {
        vi.mocked(api.searchContacts).mockResolvedValue(
            Array.from({ length: PER_PAGE }, (_unused, index) => contact(index + 1)),
        );

        await searchByKind('contacts', 1, { q: 'a', page: 1 });
        expect(getSearchState().uiFlags.contact.hasMore).toBe(true);

        // Trang 2 lặp y hệt: sau khử trùng không thêm bản ghi nào, hasMore vẫn true.
        await searchByKind('contacts', 1, { q: 'a', page: 2 });
        expect(getSearchState().contactRecords).toHaveLength(PER_PAGE);
        expect(getSearchState().uiFlags.contact.hasMore).toBe(true);
    });

    it('clears hasMore on a short page', async () => {
        vi.mocked(api.searchContacts).mockResolvedValue([contact(1)]);

        await searchByKind('contacts', 1, { q: 'a', page: 1 });

        expect(getSearchState().uiFlags.contact.hasMore).toBe(false);
    });

    it('reports failure so the caller can roll back its page counter', async () => {
        vi.mocked(api.searchContacts).mockRejectedValue(new Error('boom'));

        await expect(searchByKind('contacts', 1, { q: 'a', page: 2 })).resolves.toBe(false);
        expect(getSearchState().uiFlags.contact.isFetching).toBe(false);
    });
});

describe('fullSearch', () => {
    it('queries all four collections and marks the search completed', async () => {
        await fullSearch(7, { q: 'bảo hành', page: 1 });

        expect(api.searchContacts).toHaveBeenCalledWith(7, { q: 'bảo hành', page: 1 });
        expect(api.searchConversations).toHaveBeenCalledWith(7, { q: 'bảo hành', page: 1 });
        expect(api.searchMessages).toHaveBeenCalledWith(7, { q: 'bảo hành', page: 1 });
        expect(api.searchArticles).toHaveBeenCalledWith(7, { q: 'bảo hành', page: 1 });
        expect(getSearchState().uiFlags).toMatchObject({ isFetching: false, isSearchCompleted: true });
    });
});

describe('clearSearchResults', () => {
    it('empties every collection', async () => {
        vi.mocked(api.searchContacts).mockResolvedValue([contact(1)]);
        await searchByKind('contacts', 1, { q: 'a', page: 1 });

        clearSearchResults();

        expect(getSearchState().contactRecords).toEqual([]);
    });
});
