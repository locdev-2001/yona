import assert from 'node:assert/strict';
import test from 'node:test';

import { stickerUrlFromId, withStickerUrl } from './inbound-content.mjs';

test('dựng được địa chỉ ảnh từ mã sticker', () => {
    assert.equal(
        stickerUrlFromId(50626),
        'https://zalo-api.zadn.vn/api/emoticon/sticker/webpc?eid=50626&size=130'
    );
});

test('mã không hợp lệ thì không dựng bừa một địa chỉ', () => {
    for (const bad of [null, undefined, 0, -1, 'abc', {}]) {
        assert.equal(stickerUrlFromId(bad), null);
    }
});

test('sticker thô từ đường kéo lịch sử được bù địa chỉ', () => {
    // Đúng hình dạng đã lưu trong DB khi lỗi xảy ra: chỉ id/type/catId.
    const out = withStickerUrl({ id: 50626, type: 3, catId: 12658 });

    assert.equal(out.url, 'https://zalo-api.zadn.vn/api/emoticon/sticker/webpc?eid=50626&size=130');
    assert.equal(out.thumbnail, out.url);
    assert.equal(out.catId, 12658, 'giữ nguyên trường gốc');
});

test('sticker đã có địa chỉ thì KHÔNG bị ghi đè', () => {
    const already = { id: 1, url: 'https://cdn/that.webp' };

    assert.equal(withStickerUrl(already).url, 'https://cdn/that.webp');
});
