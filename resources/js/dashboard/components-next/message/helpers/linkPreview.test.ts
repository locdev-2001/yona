import { describe, expect, it } from 'vitest';

import { linkPreviewParts } from './linkPreview';

const URL = 'https://canva.link/abc123';
const TYPED = `${URL} dạ đây từ 36 về sau ạ`;

describe('linkPreviewParts', () => {
    it.each([
        ['tiêu đề = liên kết, nội dung = liên kết', URL, { url: URL, title: URL }, '', null],
        ['kênh nhét câu khách gõ vào tiêu đề', TYPED, { url: URL, title: TYPED }, TYPED, null],
        ['tiêu đề rỗng, khách gõ thêm chữ', TYPED, { url: URL, title: '' }, TYPED, null],
        ['tiêu đề rỗng, chỉ có liên kết', URL, { url: URL }, '', null],
        ['tiêu đề trang thật + chú thích khách', 'Anh xem giúp em', { url: URL, title: 'Bảng giá' }, 'Anh xem giúp em', 'Bảng giá'],
        ['kênh để tiêu đề trang vào nội dung khi khách không gõ gì', 'Bảng giá', { url: URL, title: 'Bảng giá' }, '', 'Bảng giá'],
        ['nội dung rỗng', null, { url: URL, title: 'Bảng giá' }, '', 'Bảng giá'],
        ['nội dung là liên kết rút gọn khác', 'https://bit.ly/x', { url: URL }, '', null],
    ])('%s', (_, content, preview, caption, title) => {
        const parts = linkPreviewParts(content, preview);

        expect(parts?.caption).toBe(caption);
        expect(parts?.title).toBe(title);
        expect(parts?.host).toBe('canva.link');
    });

    it('không có URL thì không có thẻ', () => {
        expect(linkPreviewParts('chữ', { title: 'x' })).toBeNull();
    });
});
