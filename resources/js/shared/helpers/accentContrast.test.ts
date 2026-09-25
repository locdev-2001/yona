import { describe, expect, it } from 'vitest';

import { isLightAccent } from './accentContrast';

describe('chữ trên màu nhấn của tenant (một luật cho launcher và widget)', () => {
    it('màu nhấn của design (#1B6FCC) giữ chữ trắng', () => {
        expect(isLightAccent('#1B6FCC')).toBe(false);
    });

    it('màu sáng vừa như #009CE0 (chữ trắng chỉ 3.1:1) chuyển sang chữ mực', () => {
        expect(isLightAccent('#009CE0')).toBe(true);
        expect(isLightAccent('#009ce0')).toBe(true);
    });

    it('màu mặc định của hộp thư mới (#1f93ff, chữ trắng 3.2:1) cũng dùng chữ mực', () => {
        expect(isLightAccent('#1f93ff')).toBe(true);
    });

    it('nhận mã rút gọn, mã sai thì giữ chữ trắng như trước', () => {
        expect(isLightAccent('#fff')).toBe(true);
        expect(isLightAccent('#f2f3f7')).toBe(true);
        expect(isLightAccent('#000')).toBe(false);
        expect(isLightAccent('không phải màu')).toBe(false);
    });
});
