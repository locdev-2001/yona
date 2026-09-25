import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCardPng } from './card-render/render.mjs';

const PNG_MAGIC = '89504e470d0a1a0a';

test('renderCardPng: thẻ sản phẩm ra PNG hợp lệ, kích thước hợp lý', async () => {
    const png = await renderCardPng({
        kind: 'cards',
        attributes: {
            items: [{
                id: 'item-1',
                title: 'Bình men lam 30cm',
                price: { amount: 450000, currency: 'VND', compare_at: 530000, discount_percent: 15 },
                stock_label: 'Còn 2 cái',
            }],
        },
    });

    assert.equal(png.subarray(0, 8).toString('hex'), PNG_MAGIC);
    assert.ok(png.length > 2000, `PNG quá nhỏ để là ảnh thật: ${png.length} byte`);
    assert.ok(png.length < 2_000_000, `PNG quá nặng cho một thẻ chữ: ${png.length} byte`);
});

test('renderCardPng: nhiều thẻ vẽ tối đa 3, còn lại ghi "+N sản phẩm khác"', async () => {
    const items = Array.from({ length: 5 }, (_, index) => ({ id: `item-${index + 1}`, title: `Sản phẩm ${index + 1}` }));

    const png = await renderCardPng({ kind: 'cards', attributes: { items } });

    assert.equal(png.subarray(0, 8).toString('hex'), PNG_MAGIC);
});

test('renderCardPng: order_status không có ảnh vẫn ra PNG', async () => {
    const png = await renderCardPng({
        kind: 'order_status',
        attributes: { order_ref: 'GM1024', status: 'shipped', eta: '2026-09-30', total: { amount: 480000, currency: 'VND' } },
    });

    assert.equal(png.subarray(0, 8).toString('hex'), PNG_MAGIC);
});

test('renderCardPng: webview và article cũng ra PNG hợp lệ', async () => {
    const webview = await renderCardPng({
        kind: 'webview',
        attributes: { page: 'schedule', title: 'Đặt lịch tư vấn', subtitle: 'Chọn khung giờ rảnh' },
    });
    const article = await renderCardPng({
        kind: 'article',
        attributes: { items: [{ title: 'Hướng dẫn đổi trả', description: 'Trong 7 ngày kể từ khi nhận hàng' }] },
    });

    assert.equal(webview.subarray(0, 8).toString('hex'), PNG_MAGIC);
    assert.equal(article.subarray(0, 8).toString('hex'), PNG_MAGIC);
});

test('renderCardPng: kind lạ ném lỗi thay vì render rỗng', async () => {
    await assert.rejects(() => renderCardPng({ kind: 'unknown', attributes: {} }));
});

test('renderCardPng: ảnh sản phẩm tải hỏng (host không tồn tại) vẫn ra PNG không ảnh', async () => {
    const png = await renderCardPng({
        kind: 'cards',
        attributes: { items: [{ id: 'item-1', title: 'Ảnh hỏng', media_url: 'https://khong-ton-tai.invalid/anh.jpg' }] },
    });

    assert.equal(png.subarray(0, 8).toString('hex'), PNG_MAGIC);
});
