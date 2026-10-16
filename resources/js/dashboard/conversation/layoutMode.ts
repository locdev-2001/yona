import { isPhoneScreen, isSmallScreen } from 'dashboard/composables/useViewportWidth';
import type { UISettings } from 'dashboard/composables/useUISettings';
import { LAYOUT_TYPES } from './constants';

// Bố cục cũ (ConversationView) chỉ có MỘT cách vào bố cục hai-màn: người
// dùng tự bấm nút ⇥ để đổi `ui_settings.conversation_display_type` sang
// `expanded`. Ở màn hẹp, gốc vẫn dựng ba cột cạnh nhau nên danh sách 340px đè
// lên khung chat và không mở nổi hội thoại trên điện thoại.
//
// Lệch có chủ đích (ux-deviations.md): dưới SMALL_SCREEN_BREAKPOINT BUỘC bố cục
// hai-màn — cùng cơ chế `isOnExpandedLayout` mà gốc đã có, không thêm nhánh
// layout thứ hai. Nhờ vậy mọi thứ ăn theo nó (danh sách chiếm hết bề rộng, nút
// quay lại trong header, bỏ viền trái khung chat) tự đúng theo.
//
// Ngưỡng nâng 768 → 1024 (quyết định founder 08/09/2026): ở 820px bản cũ dựng
// đủ ba cột nên khung chat chỉ còn 1px. Ba mức bố cục và hai hằng số quyết định
// chúng nằm ở `dashboard/constants/globals.ts`.

/** Người dùng đã bật bố cục mở rộng bằng nút ⇥ chưa. */
export function hasExpandedLayoutPreference(uiSettings: UISettings): boolean {
    const displayType = (uiSettings.conversation_display_type as string | undefined) ?? LAYOUT_TYPES.CONDENSED;

    return displayType !== LAYOUT_TYPES.CONDENSED;
}

export function isOnExpandedLayout(uiSettings: UISettings, viewportWidth: number): boolean {
    return isSmallScreen(viewportWidth) || hasExpandedLayoutPreference(uiSettings);
}

/** Màn danh sách: luôn hiện ở bố cục ba cột, ẩn khi hai-màn đang mở hội thoại hoặc bản nháp. */
export function showConversationList(expandedLayout: boolean, hasOpenThread: boolean): boolean {
    return expandedLayout ? !hasOpenThread : true;
}

/** Màn chat: ở bố cục hai-màn chỉ dựng khi đã mở hội thoại hoặc bản nháp. */
export function showMessageView(expandedLayout: boolean, hasOpenThread: boolean): boolean {
    return hasOpenThread ? true : !expandedLayout;
}

/** Đang mở một hội thoại hoặc bản nháp hội thoại mới (route /inbox/new). */
export function isThreadOpen(conversationId: number | null | undefined, isComposing: boolean | undefined): boolean {
    return Boolean(conversationId) || Boolean(isComposing);
}

/** Thanh tab dưới chỉ có trên điện thoại và nhường chỗ cho ô soạn tin khi đang ở trong hội thoại. */
export function showMobileTabBar(viewportWidth: number, hasOpenThread: boolean): boolean {
    return isPhoneScreen(viewportWidth) && !hasOpenThread;
}
