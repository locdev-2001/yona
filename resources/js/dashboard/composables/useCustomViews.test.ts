import { describe, expect, it } from 'vitest';

import { customViewFilterTypeId, customViewTypeOf } from './useCustomViews';

// Port từ store/modules/specs/customViews/{getters,mutations}.spec.js —
// phần chuẩn hoá filter_type (FILTER_KEYS của gốc) mà cả sidebar, ChatList
// và trang Contacts dựa vào để chọn đúng ngăn dữ liệu.
describe('customViewTypeOf', () => {
    it('nhận cả số enum lẫn chuỗi', () => {
        expect(customViewTypeOf(0)).toBe('conversation');
        expect(customViewTypeOf(1)).toBe('contact');
        expect(customViewTypeOf('conversation')).toBe('conversation');
        expect(customViewTypeOf('contact')).toBe('contact');
    });
});

describe('customViewFilterTypeId', () => {
    it('folder = 0, segment = 1 đúng enum của Rails', () => {
        expect(customViewFilterTypeId('conversation')).toBe(0);
        expect(customViewFilterTypeId('contact')).toBe(1);
    });

    it('quay vòng số → chuỗi → số không đổi', () => {
        expect(customViewFilterTypeId(customViewTypeOf(0))).toBe(0);
        expect(customViewFilterTypeId(customViewTypeOf(1))).toBe(1);
    });
});
