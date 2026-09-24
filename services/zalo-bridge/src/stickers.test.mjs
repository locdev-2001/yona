import assert from 'node:assert/strict';
import test from 'node:test';

import {
    asArray,
    catalogItemsFromBasic,
    catalogItemsFromDetails,
    parseCategoryInput,
    parseDetailInput,
    parseSearchInput,
    searchCatalog,
    stickerSendPayload,
} from './stickers.mjs';

const URL_98930 = 'https://zalo-api.zadn.vn/api/emoticon/sticker/webpc?eid=98930&size=130';

test('stickerSendPayload đọc được bộ ở cả catId, cateId, cate_id', () => {
    assert.deepEqual(stickerSendPayload({ id: 98930, catId: 61900, type: 7 }), { id: 98930, cateId: 61900, type: 7 });
    assert.deepEqual(stickerSendPayload({ id: '98930', cateId: '61900', type: 7 }), { id: 98930, cateId: 61900, type: 7 });
    assert.deepEqual(stickerSendPayload({ sticker_id: 98930, cate_id: 61900 }), { id: 98930, cateId: 61900, type: 1 });
});

test('stickerSendPayload: thiếu bộ thì 0, thiếu type thì 1, mã xấu thì null', () => {
    assert.deepEqual(stickerSendPayload({ id: 5 }), { id: 5, cateId: 0, type: 1 });
    for (const bad of [null, undefined, 'x', {}, { id: 0 }, { id: -3 }, { id: 'abc' }, { id: 1.5 }]) {
        assert.equal(stickerSendPayload(bad), null);
    }
});

test('catalogItemsFromBasic dựng ảnh từ mã bằng cùng một hàm với chiều nhận', () => {
    assert.deepEqual(catalogItemsFromBasic([{ type: 7, cate_id: 61900, sticker_id: 98930 }]), [
        { id: 98930, cate_id: 61900, type: 7, url: URL_98930, label: null },
    ]);
});

test('catalogItemsFromDetails ưu tiên stickerUrl, bỏ phần tử hỏng và trùng mã, bỏ nhãn dạng mã', () => {
    const items = catalogItemsFromDetails([
        { id: 1, cateId: 10, type: 3, stickerUrl: 'https://cdn/1.png', stickerWebpUrl: 'https://cdn/1.webp', text: 'Chào' },
        { id: 2, cateId: 10, type: 3, stickerUrl: '', stickerWebpUrl: 'https://cdn/2.webp', text: '[^10.2^]' },
        { id: 3, cateId: 10, type: 3 },
        null,
        'rác',
        { id: 'xấu' },
        { id: 1, cateId: 10, type: 3, stickerUrl: 'https://cdn/trung.png' },
    ]);

    assert.deepEqual(items, [
        { id: 1, cate_id: 10, type: 3, url: 'https://cdn/1.png', label: 'Chào' },
        { id: 2, cate_id: 10, type: 3, url: 'https://cdn/2.webp', label: null },
        {
            id: 3,
            cate_id: 10,
            type: 3,
            url: 'https://zalo-api.zadn.vn/api/emoticon/sticker/webpc?eid=3&size=130',
            label: null,
        },
    ]);
});

test('asArray chịu được mảng, dạng bọc ngoài và null', () => {
    const list = [{ sticker_id: 1 }];

    assert.equal(asArray(list), list);
    assert.deepEqual(asArray({ items: list }), list);
    assert.deepEqual(asArray({ data: list }), list);
    assert.deepEqual(asArray({ data: { stickers: list } }), list);
    assert.deepEqual(asArray({ tong: 1, ket_qua: list }), list);
    assert.deepEqual(asArray(null), []);
    assert.deepEqual(asArray(undefined), []);
    assert.deepEqual(asArray({ ok: true }), []);
});

test('parseSearchInput: từ khoá 1–50 ký tự, limit kẹp 1..50 mặc định 30', () => {
    assert.deepEqual(parseSearchInput({ keyword: '  cảm ơn ' }), { keyword: 'cảm ơn', limit: 30 });
    assert.deepEqual(parseSearchInput({ keyword: 'ok', limit: 500 }), { keyword: 'ok', limit: 50 });
    assert.deepEqual(parseSearchInput({ keyword: 'ok', limit: -1 }), { keyword: 'ok', limit: 30 });
    assert.ok(parseSearchInput({ keyword: '   ' }).error);
    assert.ok(parseSearchInput({}).error);
    assert.ok(parseSearchInput({ keyword: 'ơ'.repeat(51) }).error);
    assert.equal(parseSearchInput({ keyword: 'ơ'.repeat(50) }).keyword.length, 50);
});

test('parseDetailInput / parseCategoryInput chặn mã không phải số và quá 20 mã', () => {
    assert.deepEqual(parseDetailInput({ ids: [98930, '98931', 98930] }), { ids: [98930, 98931] });
    assert.ok(parseDetailInput({ ids: [] }).error);
    assert.ok(parseDetailInput({ ids: [1, 'x'] }).error);
    assert.ok(parseDetailInput({ ids: Array.from({ length: 21 }, (_, i) => i + 1) }).error);
    assert.deepEqual(parseCategoryInput({ cate_id: '61900' }), { cateId: 61900 });
    assert.ok(parseCategoryInput({ cate_id: 0 }).error);
});

test('searchCatalog dùng searchSticker khi có kết quả, không gọi gợi ý', async () => {
    const calls = [];
    const api = {
        async searchSticker(keyword, limit) {
            calls.push(['searchSticker', keyword, limit]);
            return [{ type: 7, cate_id: 61900, sticker_id: 98930 }];
        },
        async getStickers() {
            calls.push(['getStickers']);
            return [];
        },
    };

    const items = await searchCatalog(api, { keyword: 'chào', limit: 30 });

    assert.equal(items[0].id, 98930);
    assert.deepEqual(calls, [['searchSticker', 'chào', 30]]);
});
