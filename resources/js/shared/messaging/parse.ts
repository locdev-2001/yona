import type { Price } from './model';

// Kiểm dễ dãi phía giao diện: server đã chuẩn hoá lúc tạo tin, ở đây chỉ chặn tin
// đời cũ sai hình dạng để host rơi về bong bóng chữ thay vì vỡ giao diện.

export const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

export const text = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim() !== '' ? value : undefined;

/** Giá chuỗi của thẻ tạo trước khi có lõi ("4.290.000 ₫"), cùng luật Money phía server. */
function legacyAmount(value: string): number | undefined {
    const number = value.trim().replace(/\s*(đ|₫|VND)$/iu, '').trim();

    return /^\d+$|^\d{1,3}([.,\s]\d{3})+$/u.test(number) ? Number(number.replace(/\D/g, '')) : undefined;
}

export function price(value: unknown): Price | undefined {
    if (typeof value === 'number') return { amount: value, currency: 'VND' };

    if (typeof value === 'string') {
        const amount = legacyAmount(value);

        return amount === undefined ? undefined : { amount, currency: 'VND' };
    }

    if (!isRecord(value) || typeof value.amount !== 'number') return undefined;

    return {
        amount: value.amount,
        currency: text(value.currency) ?? 'VND',
        ...(typeof value.compare_at === 'number' ? { compare_at: value.compare_at } : {}),
        ...(typeof value.discount_percent === 'number' ? { discount_percent: value.discount_percent } : {}),
    };
}
