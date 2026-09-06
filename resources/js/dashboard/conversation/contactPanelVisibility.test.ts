import { describe, expect, it } from 'vitest';

import {
    CONTACT_PANEL_WIDE_BREAKPOINT,
    hasContactPanelChoice,
    isContactPanelOpen,
} from './contactPanelVisibility';

describe('mặc định hiển thị panel phải', () => {
    it('mở sẵn khi chưa từng chọn và khung nhìn ≥ 1280px', () => {
        expect(isContactPanelOpen({}, CONTACT_PANEL_WIDE_BREAKPOINT)).toBe(true);
        expect(isContactPanelOpen({}, 1920)).toBe(true);
    });

    it('giữ hành vi gốc (đóng) dưới 1280px', () => {
        expect(isContactPanelOpen({}, CONTACT_PANEL_WIDE_BREAKPOINT - 1)).toBe(false);
        expect(isContactPanelOpen({}, 768)).toBe(false);
    });

    it('lựa chọn của người dùng thắng mặc định ở mọi cỡ màn', () => {
        expect(isContactPanelOpen({ is_contact_sidebar_open: false }, 1920)).toBe(false);
        expect(isContactPanelOpen({ is_contact_sidebar_open: true }, 480)).toBe(true);
    });

    it('chỉ coi là đã chọn khi ui_settings có giá trị boolean', () => {
        expect(hasContactPanelChoice({})).toBe(false);
        expect(hasContactPanelChoice({ is_contact_sidebar_open: undefined })).toBe(false);
        expect(hasContactPanelChoice({ is_contact_sidebar_open: false })).toBe(true);
    });
});
