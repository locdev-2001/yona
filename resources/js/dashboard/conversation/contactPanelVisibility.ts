import { useCallback, useSyncExternalStore } from 'react';

import { isSmallScreen, useViewportWidth } from 'dashboard/composables/useViewportWidth';
import type { UISettings } from 'dashboard/composables/useUISettings';

// Lệnh founder 07/09/2026: panel phải (thông tin liên hệ) mở SẴN trên màn rộng —
// người dùng không phải đi tìm nút để thấy khách là ai. Dưới ngưỡng rộng thì giữ
// hành vi gốc Chatwoot (đóng, mở bằng nút).
//
// Lựa chọn của người dùng vẫn thắng mặc định và được nhớ ở `ui_settings`
// (PUT /api/v1/profile) — cùng chỗ Chatwoot đã lưu, nên nhớ theo TÀI KHOẢN chứ
// không chỉ theo trình duyệt. Chưa từng bấm thì khoá vắng mặt và mặc định theo
// bề rộng khung nhìn.
//
// Dưới breakpoint `md` panel là LỚP PHỦ đè lên khung chat: nó không bao giờ mở
// sẵn (kể cả khi `ui_settings` nhớ "mở" từ màn rộng) và chỉ bật trong phiên xem
// hiện tại khi người dùng bấm nút. Lựa chọn màn rộng vì thế không bị lớp phủ di
// động ghi đè — hai ngữ cảnh giữ trạng thái riêng.
export const CONTACT_PANEL_WIDE_BREAKPOINT = 1280;

export const CONTACT_PANEL_OPEN_KEY = 'is_contact_sidebar_open';

/** Người dùng đã tự chọn đóng/mở panel chưa (khoá có mặt trong ui_settings). */
export function hasContactPanelChoice(uiSettings: UISettings): boolean {
    return typeof uiSettings[CONTACT_PANEL_OPEN_KEY] === 'boolean';
}

export function isContactPanelOpen(uiSettings: UISettings, viewportWidth: number): boolean {
    if (hasContactPanelChoice(uiSettings)) return Boolean(uiSettings[CONTACT_PANEL_OPEN_KEY]);

    return viewportWidth >= CONTACT_PANEL_WIDE_BREAKPOINT;
}

// Trạng thái lớp phủ trên màn hẹp: chỉ sống trong phiên xem, không ghi
// `ui_settings`. Để ngoài React (external store) vì cả nút mở (SidepanelSwitch)
// lẫn panel (ConversationSidebar) đều phải đọc/ghi cùng một giá trị mà không có
// tổ tiên chung nào ngoài ConversationView.
let overlayOpen = false;
const overlaySubscribers = new Set<() => void>();

function subscribeOverlay(onChange: () => void): () => void {
    overlaySubscribers.add(onChange);
    return () => {
        overlaySubscribers.delete(onChange);
    };
}

export function setContactPanelOverlayOpen(open: boolean): void {
    if (overlayOpen === open) return;
    overlayOpen = open;
    overlaySubscribers.forEach((onChange) => onChange());
}

function readOverlayOpen(): boolean {
    return overlayOpen;
}

function useContactPanelOverlayOpen(): boolean {
    return useSyncExternalStore(subscribeOverlay, readOverlayOpen, () => false);
}

export function useContactPanelOpen(uiSettings: UISettings): boolean {
    const viewportWidth = useViewportWidth();
    const overlay = useContactPanelOverlayOpen();

    if (isSmallScreen(viewportWidth)) return overlay;

    return isContactPanelOpen(uiSettings, viewportWidth);
}

/**
 * Một chỗ duy nhất quyết định panel phải đang mở hay đóng và cách lật nó: màn
 * rộng ghi `ui_settings` (nhớ lâu dài), màn hẹp chỉ lật lớp phủ của phiên xem.
 */
export function useContactPanelControl(
    uiSettings: UISettings,
    updateUISettings: (patch: UISettings) => void,
): { isOpen: boolean; setOpen: (open: boolean) => void; toggle: () => void } {
    const viewportWidth = useViewportWidth();
    const isOpen = useContactPanelOpen(uiSettings);
    const smallScreen = isSmallScreen(viewportWidth);

    const setOpen = useCallback(
        (open: boolean) => {
            if (smallScreen) {
                setContactPanelOverlayOpen(open);
                return;
            }
            updateUISettings({ [CONTACT_PANEL_OPEN_KEY]: open, is_copilot_panel_open: false });
        },
        [smallScreen, updateUISettings],
    );

    const toggle = useCallback(() => setOpen(!isOpen), [isOpen, setOpen]);

    return { isOpen, setOpen, toggle };
}
