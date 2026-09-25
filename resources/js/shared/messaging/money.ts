import type { Price } from './model';

// Cùng luật với App\Messaging\Structured\Money::format: "1.250.000đ" cho VND,
// tiền tệ khác thêm mã phía sau. Không phụ thuộc locale giao diện để giá trên thẻ
// giống hệt bản chữ thuần kênh khác nhận.
export function formatMoney(amount: number, currency = 'VND'): string {
    const number = Math.round(amount)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return currency === 'VND' ? `${number}đ` : `${number} ${currency}`;
}

export const formatPrice = (price: Price): string => formatMoney(price.amount, price.currency);

/** Có giảm giá thật khi giá cũ lớn hơn giá bán. */
export const hasDiscount = (price: Price): price is Price & { compare_at: number; discount_percent: number } =>
    typeof price.compare_at === 'number' && price.compare_at > price.amount && typeof price.discount_percent === 'number';
