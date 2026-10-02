import { usePage } from '@inertiajs/react';
import { ICONS } from 'dashboard/icons';

import Button from 'dashboard/components-next/button/Button';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import { useContactPanelControl } from '../contactPanelVisibility';

// Port từ components-next/Conversation/SidepanelSwitch.vue — nút bật/tắt
// ContactPanel (lưu ui_settings.is_contact_sidebar_open). Nút Copilot chỉ hiện
// khi cờ captain_integration bật (tắt ở yona → không render). Phím tắt Alt+O bỏ (B10).
//
// Lệch có chủ đích (founder 02/10/2026): nút nằm ở cuối thanh tiêu đề hội thoại
// trên mọi cỡ màn, không nổi đè lên khung tin và không chiếm dải riêng ở mép
// phải. Icon panel-phải mở/đóng nói đúng việc nút làm.
export default function SidepanelSwitch() {
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
        <div data-testid="sidepanel-switch" className="flex flex-row items-center gap-1">
            <Button
                title={t('CONVERSATION.SIDEBAR.CONTACT')}
                aria-pressed={isContactSidebarOpen}
                ghost
                slate
                sm
                className={`!rounded-full transition-all duration-[250ms] ease-out active:!scale-95 active:!brightness-105 active:duration-75 ${
                    isContactSidebarOpen ? 'bg-n-alpha-2 active:shadow-sm' : ''
                }`}
                icon={isContactSidebarOpen ? ICONS.contactPanelClose : ICONS.contactPanelOpen}
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
