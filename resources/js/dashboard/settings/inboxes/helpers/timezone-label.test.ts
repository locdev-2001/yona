import { describe, expect, it } from 'vitest';

import { localizeTimeZoneOptions, timeZoneLabel, timeZoneOffsetLabel } from './timezone-label';

describe('timeZoneOffsetLabel', () => {
    it('tính độ lệch từ múi giờ IANA', () => {
        const at = new Date('2026-01-15T00:00:00Z');
        expect(timeZoneOffsetLabel('Asia/Ho_Chi_Minh', at)).toBe('GMT+07:00');
        expect(timeZoneOffsetLabel('Asia/Kolkata', at)).toBe('GMT+05:30');
        expect(timeZoneOffsetLabel('America/New_York', at)).toBe('GMT-05:00');
        expect(timeZoneOffsetLabel('UTC', at)).toBe('GMT+00:00');
    });

    it('theo giờ mùa hè thay vì số cố định', () => {
        expect(timeZoneOffsetLabel('Europe/Paris', new Date('2026-07-15T00:00:00Z'))).toBe('GMT+02:00');
        expect(timeZoneOffsetLabel('Europe/Paris', new Date('2026-01-15T00:00:00Z'))).toBe('GMT+01:00');
    });

    it('trả null với tên múi giờ không hợp lệ', () => {
        expect(timeZoneOffsetLabel('Not/AZone')).toBeNull();
    });
});

describe('timeZoneLabel', () => {
    const at = new Date('2026-01-15T00:00:00Z');

    it('dùng tên tiếng Việt cho múi giờ Việt Nam', () => {
        expect(timeZoneLabel('Asia/Ho_Chi_Minh', 'vi', at)).toBe('Hà Nội, TP. Hồ Chí Minh (GMT+07:00)');
    });

    it('kèm tên thành phố và độ lệch với múi giờ khác', () => {
        const label = timeZoneLabel('Asia/Tokyo', 'vi', at);
        expect(label).toContain('Tokyo');
        expect(label.endsWith('(GMT+09:00)')).toBe(true);
        expect(label).not.toMatch(/Standard Time/);
    });

    it('rơi về mã IANA khi múi giờ không hợp lệ', () => {
        expect(timeZoneLabel('Not/AZone', 'vi', at)).toBe('Not/AZone');
    });
});

describe('localizeTimeZoneOptions', () => {
    it('giữ nguyên value, bỏ nhãn GMT cứng của máy chủ', () => {
        const result = localizeTimeZoneOptions([{ label: 'Hanoi (GMT+07:00)', value: 'Asia/Ho_Chi_Minh' }], 'vi');
        expect(result).toEqual([{ label: expect.stringContaining('Hà Nội'), value: 'Asia/Ho_Chi_Minh' }]);
    });
});
