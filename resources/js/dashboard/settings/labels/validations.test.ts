import { describe, expect, it } from 'vitest';

import {
    getLabelTitleErrorMessageKey,
    isSameLabelTitle,
    normalizeLabelTitle,
    validLabelCharacters,
} from './validations';

describe('normalizeLabelTitle', () => {
    it('giữ nguyên chữ hoa và dấu tiếng Việt', () => {
        expect(normalizeLabelTitle('Khách VIP')).toBe('Khách VIP');
    });

    it('cắt khoảng trắng hai đầu trước khi lưu', () => {
        expect(normalizeLabelTitle('  Khách VIP  ')).toBe('Khách VIP');
    });

    it('giữ nguyên chuỗi đã là chữ thường', () => {
        expect(normalizeLabelTitle('vip-2')).toBe('vip-2');
    });
});

describe('validLabelCharacters', () => {
    it.each(['vip', 'VIP #1', 'khách vip', 'nhóm/ưu tiên', 'a1'])('nhận %s', title => {
        expect(validLabelCharacters(title)).toBe(true);
    });

    it.each(['', 'vip\nlabel'])('từ chối %s', title => {
        expect(validLabelCharacters(title)).toBe(false);
    });

    it('cho phép khoảng trắng hai đầu vì sẽ được cắt trước khi lưu', () => {
        expect(validLabelCharacters(' vip ')).toBe(true);
    });
});

describe('getLabelTitleErrorMessageKey', () => {
    it('rỗng → lỗi bắt buộc', () => {
        expect(getLabelTitleErrorMessageKey('')).toBe('LABEL_MGMT.FORM.NAME.REQUIRED_ERROR');
    });

    it('một ký tự → lỗi độ dài', () => {
        expect(getLabelTitleErrorMessageKey('a')).toBe('LABEL_MGMT.FORM.NAME.MINIMUM_LENGTH_ERROR');
    });

    it('label tên tự do có chữ hoa, dấu cách và ký hiệu → không lỗi', () => {
        expect(getLabelTitleErrorMessageKey('Khách VIP #1')).toBe('');
    });

    it('hợp lệ → không lỗi', () => {
        expect(getLabelTitleErrorMessageKey('vip-1')).toBe('');
    });
});

describe('isSameLabelTitle', () => {
    it('coi hai tên chỉ khác hoa thường hoặc khoảng trắng hai đầu là trùng', () => {
        expect(isSameLabelTitle('Khách VIP', '  khách vip ')).toBe(true);
    });

    it('phân biệt tên khác dấu', () => {
        expect(isSameLabelTitle('Khách VIP', 'Khach VIP')).toBe(false);
    });
});
