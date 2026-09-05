import { describe, expect, it } from 'vitest';

import {
    getLabelTitleErrorMessageKey,
    normalizeLabelTitle,
    validLabelCharacters,
} from './validations';

describe('normalizeLabelTitle', () => {
    it('hạ toàn bộ chữ thường như Label#before_validation', () => {
        expect(normalizeLabelTitle('Khách VIP')).toBe('khách vip');
    });

    it('giữ nguyên chuỗi đã là chữ thường', () => {
        expect(normalizeLabelTitle('vip-2')).toBe('vip-2');
    });
});

describe('validLabelCharacters', () => {
    it.each(['vip', 'khach-quen', 'nhom_1', 'ưutiên', 'a1'])('nhận %s', title => {
        expect(validLabelCharacters(title)).toBe(true);
    });

    it.each(['', 'a', 'co dau cach', '-vip', '_vip', 'vip!', 'vip label'])('từ chối %s', title => {
        expect(validLabelCharacters(title)).toBe(false);
    });
});

describe('getLabelTitleErrorMessageKey', () => {
    it('rỗng → lỗi bắt buộc', () => {
        expect(getLabelTitleErrorMessageKey('')).toBe('LABEL_MGMT.FORM.NAME.REQUIRED_ERROR');
    });

    it('một ký tự → lỗi độ dài', () => {
        expect(getLabelTitleErrorMessageKey('a')).toBe('LABEL_MGMT.FORM.NAME.MINIMUM_LENGTH_ERROR');
    });

    it('có dấu cách → lỗi ký tự', () => {
        expect(getLabelTitleErrorMessageKey('vip label')).toBe('LABEL_MGMT.FORM.NAME.VALID_ERROR');
    });

    it('hợp lệ → không lỗi', () => {
        expect(getLabelTitleErrorMessageKey('vip-1')).toBe('');
    });
});
