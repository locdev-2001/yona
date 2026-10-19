// Cùng luật với App\Messaging\Structured\Money::format: "1.250.000đ" cho VND,
// tiền tệ khác thêm mã phía sau. Không phụ thuộc locale giao diện để giá trên thẻ
// giống hệt bản chữ thuần kênh khác nhận.
export function formatMoney(amount: number, currency = 'VND'): string {
    const number = Math.round(amount)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return currency === 'VND' ? `${number}đ` : `${number} ${currency}`;
}
