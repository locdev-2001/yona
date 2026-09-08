import { afterEach, describe, expect, it } from 'vitest';

import { dynamicTime, formatDuration, messageStamp, messageTimestamp, shortTimestamp } from './timeHelper';

describe('formatDuration', () => {
    it('định dạng mm:ss và hh:mm:ss', () => {
        expect(formatDuration(65)).toBe('01:05');
        expect(formatDuration(3661)).toBe('01:01:01');
    });

    it('trả chuỗi rỗng cho giá trị âm hoặc thiếu', () => {
        expect(formatDuration(-1)).toBe('');
        expect(formatDuration(null)).toBe('');
        expect(formatDuration(undefined)).toBe('');
        expect(formatDuration('abc')).toBe('');
    });
});

describe('dynamicTime', () => {
    afterEach(() => {
        document.documentElement.lang = 'en';
    });

    const oneHourAgo = () => Math.floor(Date.now() / 1000) - 3600;

    it('dịch chuỗi thời gian tương đối theo locale đang dùng', () => {
        document.documentElement.lang = 'vi';
        expect(dynamicTime(oneHourAgo())).toBe('khoảng 1 giờ trước');
    });

    it('nhận cả locale dạng vi-VN', () => {
        document.documentElement.lang = 'vi-VN';
        expect(dynamicTime(oneHourAgo())).toBe('khoảng 1 giờ trước');
    });

    it('mặc định tiếng Anh khi locale lạ hoặc không khai báo', () => {
        document.documentElement.lang = 'fr';
        expect(dynamicTime(oneHourAgo())).toBe('about 1 hour ago');

        document.documentElement.lang = '';
        expect(dynamicTime(oneHourAgo())).toBe('about 1 hour ago');
    });
});

describe('shortTimestamp', () => {
    afterEach(() => {
        document.documentElement.lang = 'en';
    });

    it('rút gọn chuỗi tiếng Anh như bản gốc', () => {
        expect(shortTimestamp('an hour ago')).toBe('1h');
        expect(shortTimestamp('an hour ago', true)).toBe('1h ago');
        expect(shortTimestamp('less than a minute ago')).toBe('now');
        // Gốc bỏ chữ "about" nhưng để lại khoảng trắng — giữ nguyên quirk đó.
        expect(shortTimestamp('about 3 hours ago')).toBe(' 3h');
    });

    it('giữ dạng rút gọn kể cả khi giao diện đang chạy tiếng Việt', () => {
        document.documentElement.lang = 'vi';
        expect(shortTimestamp(Math.floor(Date.now() / 1000) - 3600)).toBe(' 1h');
        expect(shortTimestamp(Math.floor(Date.now() / 1000) - 86400, true)).toBe('1d ago');
    });
});

describe('định dạng ngày giờ theo locale', () => {
    // 2026-09-07 22:37 giờ máy chạy test.
    const stamp = Math.floor(new Date(2026, 8, 7, 22, 37).getTime() / 1000);

    afterEach(() => {
        document.documentElement.lang = 'en';
    });

    it('tiếng Anh giữ nguyên mẫu gốc Chatwoot', () => {
        document.documentElement.lang = 'en';
        expect(messageStamp(stamp)).toBe('10:37 PM');
        expect(messageTimestamp(stamp, 'LLL d, h:mm a')).toBe('Sep 7, 10:37 PM');
    });

    it('tiếng Việt dùng giờ 24 và thứ tự ngày trước tháng', () => {
        document.documentElement.lang = 'vi';
        expect(messageStamp(stamp)).toBe('22:37');
        expect(messageTimestamp(stamp, 'LLL d, h:mm a')).toBe('7 thg 9, 22:37');
    });
});
