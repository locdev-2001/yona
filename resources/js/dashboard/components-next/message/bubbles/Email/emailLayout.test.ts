import { describe, expect, it } from 'vitest';

import {
    COLLAPSE_THRESHOLD,
    EMAIL_FRAME_ROOT_ID,
    EMAIL_FRAME_SANDBOX,
    MIN_FIT_SCALE,
    buildEmailFrameDocument,
    fitEmailToWidth,
    isBodyCollapsible,
    splitPlainTextQuote,
} from './emailLayout';

describe('khung iframe thân thư', () => {
    it('sandbox không cho chạy script', () => {
        expect(EMAIL_FRAME_SANDBOX.split(' ')).not.toContain('allow-scripts');
    });

    it('bọc HTML đã lọc trong gốc có id để đo, liên kết mở tab mới', () => {
        const frameDocument = buildEmailFrameDocument('<p>Xin chào</p>');
        const parsed = new DOMParser().parseFromString(frameDocument, 'text/html');

        expect(parsed.getElementById(EMAIL_FRAME_ROOT_ID)?.innerHTML).toBe('<p>Xin chào</p>');
        expect(parsed.querySelector('base')?.getAttribute('target')).toBe('_blank');
    });
});

describe('fitEmailToWidth', () => {
    it.each([
        ['vừa khung', 360, 400],
        ['bằng khung', 400, 400],
        ['lệch 1px do làm tròn', 401, 400],
        ['khung chưa có bề ngang', 600, 0],
    ])('giữ nguyên cỡ khi thư %s', (_label, contentWidth, containerWidth) => {
        expect(fitEmailToWidth(contentWidth, containerWidth)).toBe(1);
    });

    it.each([
        [600, 360],
        [614, 253],
    ])('thu nhỏ thư rộng %ipx cho vừa khung %ipx, không tràn ngang', (contentWidth, containerWidth) => {
        const scale = fitEmailToWidth(contentWidth, containerWidth);

        expect(scale).toBeLessThan(1);
        expect(contentWidth * scale).toBeLessThanOrEqual(containerWidth);
        expect(contentWidth * scale).toBeGreaterThan(containerWidth - 1);
    });

    it('không thu nhỏ quá mức đọc được, phần dư để cuộn ngang', () => {
        expect(fitEmailToWidth(1400, 300)).toBe(MIN_FIT_SCALE);
    });
});

describe('isBodyCollapsible', () => {
    it('chỉ thu gọn thư dài hơn hẳn ngưỡng', () => {
        expect(isBodyCollapsible(COLLAPSE_THRESHOLD)).toBe(false);
        expect(isBodyCollapsible(COLLAPSE_THRESHOLD + 1)).toBe(true);
    });
});

describe('splitPlainTextQuote', () => {
    it.each([
        [
            'dòng mở đầu Gmail tiếng Anh',
            'Chào shop,\nGiao giúp mình.\n\nOn Wed, Oct 1, 2026 at 9:00 AM Shop <shop@example.test> wrote:\n> Đã xác nhận.',
        ],
        [
            'dòng mở đầu Gmail bị ngắt hai dòng',
            'Chào shop,\nGiao giúp mình.\n\nOn Wed, Oct 1, 2026 at 9:00 AM Shop\n<shop@example.test> wrote:\n> Đã xác nhận.',
        ],
        [
            'dòng mở đầu Gmail tiếng Việt',
            'Chào shop,\nGiao giúp mình.\n\nVào Th 4, 1 thg 10, 2026 lúc 09:00 Shop <shop@example.test> đã viết:\n> Đã xác nhận.',
        ],
        ['khối dòng ">" ở cuối thư', 'Chào shop,\nGiao giúp mình.\n\n> Đã xác nhận.\n> Giao 2-3 ngày.\n'],
    ])('tách phần trích dẫn theo %s', (_label, text) => {
        const parts = splitPlainTextQuote(text);

        expect(parts.reply).toBe('Chào shop,\nGiao giúp mình.');
        expect(parts.quoted).toContain('> Đã xác nhận.');
    });

    it('giữ nguyên thư không có trích dẫn', () => {
        expect(splitPlainTextQuote('Chào shop,\n> không phải trích dẫn ở giữa\nCảm ơn.\n')).toEqual({
            reply: 'Chào shop,\n> không phải trích dẫn ở giữa\nCảm ơn.',
            quoted: null,
        });
    });

    it('không giấu cả thư khi thư chỉ toàn trích dẫn', () => {
        const text = 'On Wed, Oct 1, 2026 Shop wrote:\n> Đã xác nhận.';

        expect(splitPlainTextQuote(text)).toEqual({ reply: text, quoted: null });
    });
});
