import { describe, expect, it } from 'vitest';
import { toCopyText } from './MessageFormatter';

describe('toCopyText', () => {
    it('bỏ dấu <> của autolink và giữ query', () => {
        expect(toCopyText('<https://a.vn/v/1?x=1&y_z=2>')).toBe('https://a.vn/v/1?x=1&y_z=2');
    });

    it('link có chữ giữ cả url, link trùng chữ chỉ một url', () => {
        expect(toCopyText('xem [bảng giá](https://a.vn/gia)')).toBe('xem bảng giá https://a.vn/gia');
        expect(toCopyText('[https://a.vn](https://a.vn)')).toBe('https://a.vn');
    });

    it('nhắc tên chỉ còn @Tên, bỏ markdown đậm/nghiêng/mã', () => {
        expect(toCopyText('[@Lan](mention://user/3/Lan) **gấp** _nhé_ `ok`')).toBe('@Lan gấp nhé ok');
    });

    it('giữ xuống dòng và đoạn', () => {
        expect(toCopyText('a\nb\n\nc')).toBe('a\nb\n\nc');
    });

    it('không đổi nháy thẳng thành nháy cong', () => {
        expect(toCopyText('"hi"')).toBe('"hi"');
    });
});
