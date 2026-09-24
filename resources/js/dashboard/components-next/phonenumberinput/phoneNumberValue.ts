// Máy chủ là nơi DUY NHẤT quy số về E.164 (bỏ số 0 đầu, hiểu số thiếu mã nước
// theo quốc gia mặc định). Ô nhập chỉ ghép mã nước người dùng đã chọn khi số
// chưa tự mang mã nước, và không bắt phải chọn mã nước.
const SEPARATORS = /[\s.\-()/]/g;
const TYPED_PHONE_NUMBER = /^\+?\d{2,}$/;

export function compactPhoneNumber(typed: string): string {
    return typed.replace(SEPARATORS, '');
}

export function isTypedPhoneNumberValid(typed: string): boolean {
    const compact = compactPhoneNumber(typed);

    return compact === '' || TYPED_PHONE_NUMBER.test(compact);
}

export function composePhoneNumber(dialCode: string | null, typed: string): string {
    const compact = compactPhoneNumber(typed);

    if (compact === '' || !dialCode || compact.startsWith('+') || compact.startsWith('00')) {
        return compact;
    }

    return `${dialCode}${compact}`;
}
