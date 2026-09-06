import { describe, expect, it, vi } from 'vitest';

import { DATE_RANGE_TYPES, fetchContactDetails, generateURLParams, parseURLParams } from './searchHelper';

vi.mock('dashboard/contacts/api', () => ({ fetchContact: vi.fn() }));

const { fetchContact } = await import('dashboard/contacts/api');

// Port từ dashboard/modules/search/helpers/specs/searchHelper.spec.js.
const EMPTY_DATE_RANGE = { type: null, from: null, to: null };

describe('#generateURLParams', () => {
    it('returns an empty object when nothing is set', () => {
        expect(generateURLParams({})).toEqual({});
    });

    it('generates the from parameter', () => {
        expect(generateURLParams({ from: 'agent:123' })).toEqual({ from: 'agent:123' });
    });

    it('generates the inbox_id parameter', () => {
        expect(generateURLParams({ in: 456 })).toEqual({ inbox_id: 456 });
    });

    it('generates a date range with the type only', () => {
        expect(generateURLParams({ dateRange: { type: DATE_RANGE_TYPES.LAST_7_DAYS, from: null, to: null } })).toEqual({
            range: 'last_7_days',
        });
    });

    it('generates a BETWEEN date range with both bounds', () => {
        expect(
            generateURLParams({
                dateRange: { type: DATE_RANGE_TYPES.BETWEEN, from: 1640995200, to: 1672531199 },
            }),
        ).toEqual({ range: 'between', since: 1640995200, until: 1672531199 });
    });

    it('combines every parameter', () => {
        expect(
            generateURLParams({
                from: 'agent:456',
                in: 789,
                dateRange: { type: DATE_RANGE_TYPES.BETWEEN, from: 1640995200, to: 1672531199 },
            }),
        ).toEqual({
            from: 'agent:456',
            inbox_id: 789,
            range: 'between',
            since: 1640995200,
            until: 1672531199,
        });
    });

    it('strips every filter when advanced search is disabled', () => {
        expect(
            generateURLParams(
                {
                    from: 'agent:123',
                    in: 456,
                    dateRange: { type: DATE_RANGE_TYPES.BETWEEN, from: 1640995200, to: 1672531199 },
                },
                false,
            ),
        ).toEqual({});
    });
});

describe('#parseURLParams', () => {
    it('returns default values for an empty query', () => {
        expect(parseURLParams({})).toEqual({ from: null, in: null, dateRange: EMPTY_DATE_RANGE });
    });

    it('parses inbox_id as a number', () => {
        expect(parseURLParams({ inbox_id: '456' })).toEqual({
            from: null,
            in: 456,
            dateRange: EMPTY_DATE_RANGE,
        });
    });

    it('parses an explicit range parameter', () => {
        expect(parseURLParams({ range: 'last_7_days', since: '1640995200', until: '1672531199' })).toEqual({
            from: null,
            in: null,
            dateRange: { type: 'last_7_days', from: 1640995200, to: 1672531199 },
        });
    });

    it('infers BETWEEN when since and until are present without a range', () => {
        expect(parseURLParams({ since: '1640995200', until: '1672531199' })).toEqual({
            from: null,
            in: null,
            dateRange: { type: 'between', from: 1640995200, to: 1672531199 },
        });
    });

    it('prioritises an explicit range over the inferred type', () => {
        expect(parseURLParams({ range: 'custom', since: '1640995200', until: '1672531199' }).dateRange.type).toBe(
            'custom',
        );
    });

    it('returns empty filters when advanced search is disabled', () => {
        expect(
            parseURLParams(
                { from: 'agent:123', inbox_id: '456', range: 'between', since: '1640995200', until: '1672531199' },
                false,
            ),
        ).toEqual({ from: null, in: null, dateRange: EMPTY_DATE_RANGE });
    });
});

describe('#fetchContactDetails', () => {
    it('returns the contact on success', async () => {
        const contact = { id: 123, name: 'John Doe' };
        vi.mocked(fetchContact).mockResolvedValue(contact as never);

        await expect(fetchContactDetails(1, 123)).resolves.toEqual(contact);
        expect(fetchContact).toHaveBeenCalledWith(1, 123);
    });

    it('returns null on failure', async () => {
        vi.mocked(fetchContact).mockRejectedValue(new Error('API Error'));

        await expect(fetchContactDetails(1, 123)).resolves.toBeNull();
    });
});
