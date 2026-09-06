import { describe, expect, it } from 'vitest';

import { isNumber, isPhoneE164, isPhoneE164OrEmpty } from './Validators';

// Port từ shared/helpers/specs/ValidatorsHelper.spec.js — phần luật dùng cho form
// kênh Twilio/WhatsApp/Bandwidth (F2–F5).

describe('isPhoneE164', () => {
    it('nhận số E.164 đúng', () => {
        expect(isPhoneE164('+1234567890')).toBe(true);
    });

    it('từ chối số thiếu dấu +, có chữ, hoặc quá dài', () => {
        expect(isPhoneE164('1234567890')).toBe(false);
        expect(isPhoneE164('12345678A9')).toBe(false);
        expect(isPhoneE164('+12345678901234567890')).toBe(false);
    });
});

describe('isPhoneE164OrEmpty', () => {
    it('nhận số đúng và cả chuỗi rỗng', () => {
        expect(isPhoneE164OrEmpty('+1234567890')).toBe(true);
        expect(isPhoneE164OrEmpty('')).toBe(true);
    });

    it('từ chối số sai định dạng', () => {
        expect(isPhoneE164OrEmpty('1234567890')).toBe(false);
        expect(isPhoneE164OrEmpty('12345678A9')).toBe(false);
        expect(isPhoneE164OrEmpty('+12345678901234567890')).toBe(false);
    });
});

describe('isNumber', () => {
    it('chỉ nhận chuỗi toàn chữ số', () => {
        expect(isNumber('1234567890')).toBe(true);
        expect(isNumber('12345678A9')).toBe(false);
        expect(isNumber('')).toBe(false);
    });
});
