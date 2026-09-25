import type { PaymentAccountFormValues } from './types';

export const ACCOUNT_NUMBER_PATTERN = /^\d{4,30}$/;

export const isAccountNumberValid = (value: string): boolean => ACCOUNT_NUMBER_PATTERN.test(value.trim());

export const isAccountNameValid = (value: string): boolean => value.trim() !== '';

export const isPaymentAccountFormValid = (values: PaymentAccountFormValues): boolean =>
    values.bank_bin !== '' && isAccountNumberValid(values.account_number) && isAccountNameValid(values.account_name);

// Xem trước cách ngân hàng sẽ in tên chủ tài khoản: viết hoa, không dấu. Máy
// chủ mới là nguồn chuẩn (Str::ascii) — đây chỉ để người nhập thấy ngay khi gõ.
export function normalizeAccountName(name: string): string {
    const withoutDiacritics = name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');

    return withoutDiacritics.toUpperCase().replace(/\s+/g, ' ').trimStart();
}
