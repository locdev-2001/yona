import { describe, expect, it } from 'vitest';

import { composePhoneNumber, isTypedPhoneNumberValid } from './phoneNumberValue';

describe('composePhoneNumber', () => {
    it('ghép mã nước đã chọn, để máy chủ bỏ số 0 đầu', () => {
        expect(composePhoneNumber('+84', '0912 345 678')).toBe('+840912345678');
        expect(composePhoneNumber('+84', '912345678')).toBe('+84912345678');
    });

    it('không bắt chọn mã nước: số gửi nguyên cho máy chủ hiểu theo quốc gia mặc định', () => {
        expect(composePhoneNumber(null, '0912345678')).toBe('0912345678');
        expect(composePhoneNumber('', '84912345678')).toBe('84912345678');
    });

    it('số đã mang mã nước thì giữ nguyên, không ghép thêm', () => {
        expect(composePhoneNumber('+84', '+1 202 555 0123')).toBe('+12025550123');
        expect(composePhoneNumber('+84', '0084912345678')).toBe('0084912345678');
    });

    it('xoá hết thì gửi rỗng', () => {
        expect(composePhoneNumber('+84', '  ')).toBe('');
    });
});

describe('isTypedPhoneNumberValid', () => {
    it.each(['', '0912345678', '0912 345 678', '0912.345.678', '+84912345678', '(028) 3812-3456'])('nhận %s', typed => {
        expect(isTypedPhoneNumberValid(typed)).toBe(true);
    });

    it.each(['abc', '09x12345678', '9', '+'])('từ chối %s', typed => {
        expect(isTypedPhoneNumberValid(typed)).toBe(false);
    });
});
