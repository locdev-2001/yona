import { describe, expect, it } from 'vitest';

import { getContrastingTextColor, isLightBackground } from './colorHelper';

describe('chữ trên màu nhấn của widget', () => {
    it('màu nhấn của design (#1B6FCC) giữ chữ trắng', () => {
        expect(isLightBackground('#1B6FCC')).toBe(false);
        expect(getContrastingTextColor('#1B6FCC')).toBe('#FFFFFF');
    });

    it('màu sáng vừa như #009CE0 (chữ trắng chỉ 3.1:1) chuyển sang chữ tối', () => {
        expect(isLightBackground('#009CE0')).toBe(true);
        expect(getContrastingTextColor('#009ce0')).toBe('#000000');
    });

    it('nhận mã rút gọn, mã sai thì giữ chữ trắng như trước', () => {
        expect(isLightBackground('#fff')).toBe(true);
        expect(isLightBackground('#000')).toBe(false);
        expect(isLightBackground('không phải màu')).toBe(false);
    });
});
