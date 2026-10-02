import { usePage } from '@inertiajs/react';
import { ICONS } from 'dashboard/icons';

import Button from 'dashboard/components-next/button/Button';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import { useContactPanelControl } from '../contactPanelVisibility';

// Port từ components-next/Conversation/SidepanelSwitch.vue — nút mở ContactPanel
// (lưu ui_settings.is_contact_sidebar_open). Nút Copilot chỉ hiện khi cờ
// captain_integration bật (tắt ở yona → không render). Phím tắt Alt+O bỏ (B10).
//
// Lệch có chủ đích (founder 02/10/2026): không còn cụm nút nổi đè lên khung tin.
// Màn rộng: panel đóng thì thu thành dải hẹp ở mép phải (`rail`, trong
// ConversationSidebar); panel mở thì đóng bằng dấu × ở đầu panel. Dưới ngưỡng
// ba cột cụm nút nằm trong mũ khung chat (`inline`). Cùng một component, chỉ
// khác lớp bao, nên hành vi bật/tắt chỉ có một chỗ.
const CONTAINER_CLASS = {
    rail: 'flex flex-col items-center gap-1',
    inline: 'flex flex-row items-center gap-1',
} as const;

export default function SidepanelSwitch({ variant }: { variant: keyof typeof CONTAINER_CLASS }) {
    const { uiSettings, updateUISettings } = useConversation();
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const showCopilotTab = Boolean(currentAccount.features.captain_integration);
    // Gốc chỉ MỞ được bằng nút này (đóng phải tìm dấu × trong panel). Panel giờ
    // mở sẵn trên màn rộng nên nút phải đóng được, và lựa chọn được nhớ lại.
    // Trên màn hẹp cùng nút này bật/tắt lớp phủ (không ghi ui_settings).
    const { isOpen: isContactSidebarOpen, toggle: handleConversationSidebarToggle } = useContactPanelControl(
        uiSettings,
        updateUISettings,
    );
    const isCopilotPanelOpen = Boolean(uiSettings.is_copilot_panel_open);

    const handleCopilotSidebarToggle = () =>
        updateUISettings({ is_contact_sidebar_open: false, is_copilot_panel_open: true });

    return (
        <div data-testid={`sidepanel-switch-${variant}`} className={CONTAINER_CLASS[variant]}>
            <Button
                title={t('CONVERSATION.SIDEBAR.CONTACT')}
                ghost
                slate
                sm
                className={`!rounded-full transition-all duration-[250ms] ease-out active:!scale-95 active:!brightness-105 active:duration-75 ${
                    isContactSidebarOpen ? 'bg-n-alpha-2 active:shadow-sm' : ''
                }`}
                icon={ICONS.contact}
                onClick={handleConversationSidebarToggle}
            />
            {showCopilotTab ? (
                <Button
                    title={t('CONVERSATION.SIDEBAR.COPILOT')}
                    ghost
                    slate
                    sm
                    className={`!rounded-full transition-all duration-[250ms] ease-out active:!scale-95 active:duration-75 ${
                        isCopilotPanelOpen ? 'bg-n-alpha-2 !text-n-iris-9 active:!brightness-105 active:shadow-sm' : ''
                    }`}
                    icon={ICONS.aiAssistant}
                    onClick={handleCopilotSidebarToggle}
                />
            ) : null}
        </div>
    );
}
