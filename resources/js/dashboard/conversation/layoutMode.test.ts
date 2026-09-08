import { describe, expect, it } from 'vitest';

import { SMALL_SCREEN_BREAKPOINT } from 'dashboard/constants/globals';
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
    it('màn hẹp hơn md luôn là bố cục hai-màn dù người dùng để condensed', () => {
        expect(isOnExpandedLayout(CONDENSED, 390)).toBe(true);
        expect(isOnExpandedLayout({}, SMALL_SCREEN_BREAKPOINT - 1)).toBe(true);
    });

    it('từ md trở lên giữ nguyên lựa chọn của người dùng', () => {
        expect(isOnExpandedLayout(CONDENSED, SMALL_SCREEN_BREAKPOINT)).toBe(false);
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
