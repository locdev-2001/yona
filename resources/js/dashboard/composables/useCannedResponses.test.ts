import { describe, expect, it, vi } from 'vitest';

const { postJson } = vi.hoisted(() => ({ postJson: vi.fn() }));
vi.mock('dashboard/helper/apiClient', () => ({ deleteJson: vi.fn(), getJson: vi.fn(), patchJson: vi.fn(), postJson }));

import { markCannedResponseUsed, searchCannedResponses, sortCannedResponses } from './useCannedResponses';
import type { CannedResponse } from './useCannedResponses';

const RECORDS: CannedResponse[] = [
    { id: 1, short_code: 'refund', content: 'We have issued a **refund** to your card.' },
    { id: 2, short_code: 'greeting', content: 'Hello there, how can I help you today?' },
    { id: 3, short_code: 'bye', content: 'Thanks for reaching out, have a great day.' },
];

describe('sortCannedResponses', () => {
    it('sắp theo short_code tăng dần', () => {
        expect(sortCannedResponses(RECORDS, 'asc').map(record => record.short_code)).toEqual([
            'bye',
            'greeting',
            'refund',
        ]);
    });

    it('sắp theo short_code giảm dần', () => {
        expect(sortCannedResponses(RECORDS, 'desc').map(record => record.short_code)).toEqual([
            'refund',
            'greeting',
            'bye',
        ]);
    });

    it('không đổi mảng gốc', () => {
        const original = [...RECORDS];
        sortCannedResponses(RECORDS, 'desc');
        expect(RECORDS).toEqual(original);
    });
});

describe('searchCannedResponses', () => {
    it('trả nguyên danh sách khi truy vấn rỗng hoặc chỉ khoảng trắng', () => {
        expect(searchCannedResponses(RECORDS, '')).toBe(RECORDS);
        expect(searchCannedResponses(RECORDS, '   ')).toBe(RECORDS);
    });

    it('lọc theo short_code', () => {
        const found = searchCannedResponses(RECORDS, 'refund');
        expect(found.map(record => record.short_code)).toContain('refund');
        expect(found).toHaveLength(1);
    });

    it('lọc được cả theo nội dung', () => {
        const found = searchCannedResponses(RECORDS, 'great day');
        expect(found.map(record => record.short_code)).toContain('bye');
    });

    it('trả rỗng khi không khớp gì', () => {
        expect(searchCannedResponses(RECORDS, 'zzzz-khong-co')).toEqual([]);
    });
});

describe('markCannedResponseUsed', () => {
    it('ghi một lượt dùng, lỗi mạng không lọt ra ngoài', async () => {
        postJson.mockRejectedValueOnce(new Error('offline'));

        expect(() => markCannedResponseUsed(4, 9)).not.toThrow();
        expect(postJson).toHaveBeenCalledWith('/api/v1/accounts/4/canned_responses/9/usages', {});
        await Promise.resolve();
    });

    it('thiếu account hay id thì không gọi', () => {
        postJson.mockClear();
        markCannedResponseUsed(0, 9);
        expect(postJson).not.toHaveBeenCalled();
    });
});
