import { describe, expect, it } from 'vitest';

import { isAccountNumberValid, isPaymentAccountFormValid, normalizeAccountName } from './validations';
import type { PaymentAccountFormValues } from './types';

const baseValues: PaymentAccountFormValues = {
    bank_bin: '970436',
    account_number: '1023456789',
    account_name: 'HKD GOM MOC',
    memo_template: '{ma_hoi_thoai}',
    is_default: false,
    allow_all_agents: true,
};

describe('isAccountNumberValid', () => {
    it.each(['1234', '1023456789', '123456789012345678901234567890'])('nhận số tài khoản %s', value => {
        expect(isAccountNumberValid(value)).toBe(true);
    });

    it.each(['', '123', 'abc123', '10 234', '1234567890123456789012345678901'])('từ chối %s', value => {
        expect(isAccountNumberValid(value)).toBe(false);
    });
});

describe('isPaymentAccountFormValid', () => {
    it('đủ ngân hàng, số tài khoản và chủ tài khoản thì hợp lệ', () => {
        expect(isPaymentAccountFormValid(baseValues)).toBe(true);
    });

    it('chưa chọn ngân hàng thì không hợp lệ', () => {
        expect(isPaymentAccountFormValid({ ...baseValues, bank_bin: '' })).toBe(false);
    });

    it('số tài khoản sai định dạng thì không hợp lệ', () => {
        expect(isPaymentAccountFormValid({ ...baseValues, account_number: 'abc' })).toBe(false);
    });

    it('chưa nhập chủ tài khoản thì không hợp lệ', () => {
        expect(isPaymentAccountFormValid({ ...baseValues, account_name: '   ' })).toBe(false);
    });
});

describe('normalizeAccountName', () => {
    it('viết hoa và bỏ dấu tiếng Việt', () => {
        expect(normalizeAccountName('Hộ kinh doanh Gốm Mộc')).toBe('HO KINH DOANH GOM MOC');
    });

    it('gộp nhiều khoảng trắng liền nhau', () => {
        expect(normalizeAccountName('Nguyễn   Văn A')).toBe('NGUYEN VAN A');
    });
});
