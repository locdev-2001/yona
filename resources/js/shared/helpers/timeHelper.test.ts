import { afterEach, describe, expect, it } from 'vitest';

import { setLocale } from '../../i18n';
import { dynamicTime, formatDuration, formatInLocale, messageStamp, messageTimestamp, shortTimestamp } from './timeHelper';

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
    const secondsFromNow = (seconds: number) => Math.floor(Date.now() / 1000) + seconds;

    afterEach(() => {
        setLocale('en');
    });

    it('tiếng Anh giữ đơn vị một chữ', () => {
        expect(shortTimestamp(secondsFromNow(-10))).toBe('now');
        expect(shortTimestamp(secondsFromNow(-3 * 60))).toBe('3m');
        expect(shortTimestamp(secondsFromNow(-3 * 3600))).toBe('3h');
        expect(shortTimestamp(secondsFromNow(-86400), true)).toBe('1d ago');
        expect(shortTimestamp(secondsFromNow(-60 * 86400))).toBe('2mo');
        expect(shortTimestamp(secondsFromNow(-400 * 86400))).toBe('1y');
    });

    it('tiếng Việt viết ngắn tự nhiên, không lộ chữ tiếng Anh', () => {
        setLocale('vi');

        expect(shortTimestamp(secondsFromNow(-10))).toBe('vừa xong');
        expect(shortTimestamp(secondsFromNow(-10), true)).toBe('vừa xong');
        expect(shortTimestamp(secondsFromNow(-26 * 60))).toBe('26 phút');
        expect(shortTimestamp(secondsFromNow(-2 * 3600))).toBe('2 giờ');
        expect(shortTimestamp(secondsFromNow(-5 * 86400))).toBe('5 ngày');
        expect(shortTimestamp(secondsFromNow(-60 * 86400))).toBe('2 tháng');
        expect(shortTimestamp(secondsFromNow(-400 * 86400))).toBe('1 năm');
        expect(shortTimestamp(secondsFromNow(-3 * 3600), true)).toBe('3 giờ trước');
    });

    it('mốc tương lai (hạn tạm ẩn) chỉ là độ dài, không kèm chữ "trước"', () => {
        expect(shortTimestamp(secondsFromNow(3 * 86400))).toBe('3d');

        setLocale('vi');
        expect(shortTimestamp(secondsFromNow(2 * 3600))).toBe('2 giờ');
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

describe('formatInLocale', () => {
    afterEach(() => {
        document.documentElement.lang = 'en';
    });

    // Báo cáo chạy tiếng Việt nhưng ngày in tiếng Anh ("Sep 14, 2026") — mọi mẫu
    // ngày của trang Báo cáo phải đi qua đây và đổi theo locale.
    it('đổi tên tháng và thứ tự theo locale vi', () => {
        const date = new Date(2026, 8, 14);

        document.documentElement.lang = 'en';
        expect(formatInLocale(date, 'MMM d, yyyy')).toBe('Sep 14, 2026');

        document.documentElement.lang = 'vi';
        expect(formatInLocale(date, 'MMM d, yyyy')).not.toContain('Sep');
        expect(formatInLocale(date, 'dd-MMM')).not.toContain('Sep');
        expect(formatInLocale(date, 'MMM-yyyy')).not.toContain('Sep');
    });

    it('bỏ AM/PM khi locale vi', () => {
        document.documentElement.lang = 'vi';
        const evening = new Date(2026, 8, 14, 20, 5);
        expect(formatInLocale(evening, 'dd MMM yyyy, h:mm a')).toContain('20:05');
    });
});
