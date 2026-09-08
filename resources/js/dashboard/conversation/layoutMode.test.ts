import { describe, expect, it } from 'vitest';

import { LARGE_SCREEN_BREAKPOINT, SMALL_SCREEN_BREAKPOINT } from 'dashboard/constants/globals';
import { isContactPanelOpen, isContactPanelOverlay } from './contactPanelVisibility';
import { LAYOUT_TYPES } from './constants';
import {
    hasExpandedLayoutPreference,
    isOnExpandedLayout,
    showConversationList,
    showMessageView,
} from './layoutMode';

const CONDENSED = { conversation_display_type: LAYOUT_TYPES.CONDENSED };
const EXPANDED = { conversation_display_type: LAYOUT_TYPES.EXPANDED };

describe('chọn bố cục theo breakpoint', () => {
    it('màn hẹp hơn lg luôn là bố cục hai-màn dù người dùng để condensed', () => {
        expect(isOnExpandedLayout(CONDENSED, 390)).toBe(true);
        expect(isOnExpandedLayout(CONDENSED, 820)).toBe(true);
        expect(isOnExpandedLayout({}, SMALL_SCREEN_BREAKPOINT - 1)).toBe(true);
    });

    it('từ lg trở lên giữ nguyên lựa chọn của người dùng', () => {
        expect(isOnExpandedLayout(CONDENSED, SMALL_SCREEN_BREAKPOINT)).toBe(false);
        expect(isOnExpandedLayout(CONDENSED, 1152)).toBe(false);
        expect(isOnExpandedLayout({}, 1440)).toBe(false);
        expect(isOnExpandedLayout(EXPANDED, 1440)).toBe(true);
    });

    it('bề rộng chưa đo được (SSR) thì không tự bật hai-màn', () => {
        expect(isOnExpandedLayout({}, 0)).toBe(false);
    });

    it('lựa chọn ⇥ đọc riêng khỏi breakpoint để nút lật đúng chiều', () => {
        expect(hasExpandedLayoutPreference(CONDENSED)).toBe(false);
        expect(hasExpandedLayoutPreference({})).toBe(false);
        expect(hasExpandedLayoutPreference(EXPANDED)).toBe(true);
    });
});

describe('hai-màn: danh sách và khung chat không cùng lúc', () => {
    it('màn hẹp chưa chọn hội thoại thì chỉ có danh sách', () => {
        expect(showConversationList(true, 0)).toBe(true);
        expect(showMessageView(true, 0)).toBe(false);
    });

    it('màn hẹp đã chọn hội thoại thì chỉ có khung chat', () => {
        expect(showConversationList(true, 27)).toBe(false);
        expect(showMessageView(true, 27)).toBe(true);
    });

    it('ba cột giữ cả hai ở mọi trạng thái', () => {
        expect(showConversationList(false, 0)).toBe(true);
        expect(showMessageView(false, 0)).toBe(true);
        expect(showConversationList(false, 27)).toBe(true);
        expect(showMessageView(false, 27)).toBe(true);
    });
});

// Ba mức bố cục do founder chốt 08/09/2026 — kiểm ngay ở ranh giới để hai hằng
// số trong globals.ts không bị lệch khỏi lớp CSS `lg:` / `xl:`.
describe('ba mức bố cục theo bề rộng', () => {
    it('dưới 1024: hai-màn, panel phải là lớp phủ', () => {
        expect(isOnExpandedLayout(CONDENSED, 390)).toBe(true);
        expect(isContactPanelOverlay(390)).toBe(true);
        expect(isOnExpandedLayout(CONDENSED, 820)).toBe(true);
        expect(isContactPanelOverlay(820)).toBe(true);
    });

    it('1024–1279: hai cột (danh sách + chat), panel phải vẫn là lớp phủ', () => {
        expect(isOnExpandedLayout(CONDENSED, SMALL_SCREEN_BREAKPOINT)).toBe(false);
        expect(isContactPanelOverlay(SMALL_SCREEN_BREAKPOINT)).toBe(true);
        expect(isContactPanelOverlay(LARGE_SCREEN_BREAKPOINT - 1)).toBe(true);
        expect(isContactPanelOpen({}, SMALL_SCREEN_BREAKPOINT)).toBe(false);
    });

    it('từ 1280: ba cột, panel phải mở sẵn và nhớ lựa chọn', () => {
        expect(isOnExpandedLayout(CONDENSED, LARGE_SCREEN_BREAKPOINT)).toBe(false);
        expect(isContactPanelOverlay(LARGE_SCREEN_BREAKPOINT)).toBe(false);
        expect(isContactPanelOpen({}, LARGE_SCREEN_BREAKPOINT)).toBe(true);
        expect(isContactPanelOpen({ is_contact_sidebar_open: false }, 1440)).toBe(false);
    });
});
