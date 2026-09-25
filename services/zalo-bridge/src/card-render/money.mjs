/**
 * Tương đương `App\Messaging\Structured\Money::format` phía PHP — bridge không
 * gọi lại được PHP nên chép công thức, cùng quy tắc "450.000đ" cho VND.
 */
export function formatMoney(amount, currency = 'VND') {
    const number = Math.round(Number(amount) || 0).toLocaleString('vi-VN');

    return currency === 'VND' ? `${number}đ` : `${number} ${currency}`;
}
