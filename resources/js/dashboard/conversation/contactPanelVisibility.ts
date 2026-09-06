import { useEffect, useState } from 'react';

import type { UISettings } from 'dashboard/composables/useUISettings';

// Lệnh founder 07/09/2026: panel phải (thông tin liên hệ) mở SẴN trên màn rộng —
// người dùng không phải đi tìm nút để thấy khách là ai. Dưới ngưỡng rộng thì giữ
// hành vi gốc Chatwoot (đóng, mở bằng nút).
//
// Lựa chọn của người dùng vẫn thắng mặc định và được nhớ ở `ui_settings`
// (PUT /api/v1/profile) — cùng chỗ Chatwoot đã lưu, nên nhớ theo TÀI KHOẢN chứ
// không chỉ theo trình duyệt. Chưa từng bấm thì khoá vắng mặt và mặc định theo
// bề rộng khung nhìn.
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

function currentViewportWidth(): number {
    return typeof window === 'undefined' ? 0 : window.innerWidth;
}

/** Bề rộng khung nhìn hiện tại, cập nhật khi người dùng đổi cỡ cửa sổ. */
export function useViewportWidth(): number {
    const [width, setWidth] = useState(currentViewportWidth);

    useEffect(() => {
        const onResize = () => setWidth(currentViewportWidth());
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return width;
}

export function useContactPanelOpen(uiSettings: UISettings): boolean {
    const viewportWidth = useViewportWidth();

    return isContactPanelOpen(uiSettings, viewportWidth);
}
