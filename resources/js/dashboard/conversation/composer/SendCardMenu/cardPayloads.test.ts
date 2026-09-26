import { describe, expect, it } from 'vitest';

import { parseAmount, productError, productPayload, quickRepliesError, quickRepliesPayload, withPreviewDiscount } from './cardPayloads';

const labels = { order: 'Đặt mua', view: 'Xem' };
const product = {
    title: ' Bình men lam ',
    mediaUrl: 'https://cdn.gommoc.vn/lam.jpg',
    price: '450.000',
    compareAt: '530000đ',
    stockLabel: 'Còn 2 cái',
    maxQuantity: '2',
    variants: [
        { name: 'Màu', options: 'Lam, Ngà , ,Ngọc' },
        { name: '', options: '' },
    ],
    link: 'https://gommoc.vn/binh-lam',
};

describe('trả lời nhanh', () => {
    it('bỏ ô trống, value = chữ hiện; báo thiếu, trùng, quá dài', () => {
        expect(quickRepliesPayload({ question: ' Nhận hàng khi nào? ', options: ['Sáng', '', 'Tối'] })).toEqual({
            contentType: 'input_select',
            content: 'Nhận hàng khi nào?',
            contentAttributes: { items: [{ title: 'Sáng', value: 'Sáng' }, { title: 'Tối', value: 'Tối' }] },
        });
        expect(quickRepliesError({ question: '', options: ['a', 'b'] })).toBe('QUESTION_REQUIRED');
        expect(quickRepliesError({ question: 'Q', options: ['a', ''] })).toBe('TOO_FEW_OPTIONS');
        expect(quickRepliesError({ question: 'Q', options: ['Sáng', 'sáng'] })).toBe('DUPLICATE_OPTION');
        expect(quickRepliesError({ question: 'Q', options: ['a', 'x'.repeat(81)] })).toBe('OPTION_TOO_LONG');
    });
});

describe('thẻ sản phẩm', () => {
    it('giá nhập kiểu nào cũng ra số; biến thể tách bằng dấu phẩy; có nút Đặt mua và Xem', () => {
        expect(parseAmount('1.250.000đ')).toBe(1250000);
        expect(productError(product)).toBeNull();

        const item = (productPayload(product, labels).contentAttributes.items as Record<string, unknown>[])[0];
        expect(item).toEqual({
            title: 'Bình men lam',
            media_url: 'https://cdn.gommoc.vn/lam.jpg',
            price: { amount: 450000, compare_at: 530000 },
            stock_label: 'Còn 2 cái',
            max_quantity: 2,
            variants: [{ name: 'Màu', options: [{ value: 'Lam', label: 'Lam' }, { value: 'Ngà', label: 'Ngà' }, { value: 'Ngọc', label: 'Ngọc' }] }],
            actions: [{ kind: 'order', label: 'Đặt mua' }, { kind: 'link', label: 'Xem', url: 'https://gommoc.vn/binh-lam' }],
        });
    });

    it('giá cũ phải lớn hơn giá bán; link phải http(s)', () => {
        expect(productError({ ...product, compareAt: '400000' })).toBe('COMPARE_AT_INVALID');
        expect(productError({ ...product, link: 'javascript:alert(1)' })).toBe('LINK_INVALID');
        expect(productError({ ...product, title: '' })).toBe('TITLE_REQUIRED');
    });

    it('xem trước tự tính % giảm như máy chủ', () => {
        const item = (withPreviewDiscount(productPayload(product, labels)).contentAttributes.items as { price: Record<string, unknown> }[])[0];
        expect(item.price).toMatchObject({ discount_percent: 15, currency: 'VND' });
    });
});

describe('thẻ chuyển khoản và chọn lịch', () => {
    it('chuyển khoản chỉ gửi mã tài khoản, số tiền, nội dung; nội dung mặc định thay số hội thoại', async () => {
        const { bankTransferPayload, bankTransferError, defaultMemo } = await import('./cardPayloads');
        const account = { id: 3, bank_name: 'VCB', account_number: '1023', account_name: 'GOM MOC', memo_template: 'GM {ma_hoi_thoai}', is_default: true };

        expect(defaultMemo(account, 17)).toBe('GM 17');
        expect(bankTransferError({ paymentAccountId: null, amount: '', memo: '' })).toBe('ACCOUNT_REQUIRED');
        expect(bankTransferPayload({ paymentAccountId: 3, amount: '480.000', memo: ' GM 17 ' })).toEqual({
            contentType: 'bank_transfer',
            contentAttributes: { payment_account_id: 3, amount: 480000, memo: 'GM 17' },
        });
    });

    it('chọn lịch: bỏ dòng thiếu ngày/giờ, mỗi khung có value riêng', async () => {
        const { schedulePayload, scheduleError } = await import('./cardPayloads');
        const draft = {
            title: 'Chọn lịch nhận hàng',
            note: '',
            slots: [
                { date: '2026-09-27', label: '8:00 đến 10:00' },
                { date: '', label: 'thiếu ngày' },
                { date: '2026-09-28', label: '8:00 đến 10:00' },
            ],
        };

        expect(scheduleError({ ...draft, slots: [{ date: '', label: '' }] })).toBe('SLOTS_REQUIRED');
        expect(schedulePayload(draft).contentAttributes).toEqual({
            page: 'schedule',
            title: 'Chọn lịch nhận hàng',
            data: {
                slots: [
                    { date: '2026-09-27', label: '8:00 đến 10:00', value: '2026-09-27-1' },
                    { date: '2026-09-28', label: '8:00 đến 10:00', value: '2026-09-28-2' },
                ],
            },
        });
    });
});
