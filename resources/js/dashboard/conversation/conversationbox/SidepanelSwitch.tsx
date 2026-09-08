import { usePage } from '@inertiajs/react';

import Button from 'dashboard/components-next/button/Button';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import { useContactPanelControl } from '../contactPanelVisibility';

// Port từ components-next/Conversation/SidepanelSwitch.vue — nhóm nút nổi góc
// phải vùng tin nhắn: mở ContactPanel (lưu ui_settings.is_contact_sidebar_open).
// Nút Copilot chỉ hiện khi cờ captain_integration bật (tắt ở yona → không render).
// Phím tắt Alt+O bỏ (B10).
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
        <div className="flex flex-col justify-center items-center absolute top-36 xl:top-24 ltr:right-2 rtl:left-2 bg-n-solid-2/90 backdrop-blur-lg border border-n-weak/50 rounded-full gap-1.5 p-1.5 shadow-sm transition-shadow duration-200 hover:shadow !z-20 has-[button:not(:disabled):active]:scale-[0.98] transition-transform ease-out">
            <Button
                title={t('CONVERSATION.SIDEBAR.CONTACT')}
                ghost
                slate
                sm
                className={`!rounded-full transition-all duration-[250ms] ease-out active:!scale-95 active:!brightness-105 active:duration-75 ${
                    isContactSidebarOpen ? 'bg-n-alpha-2 active:shadow-sm' : ''
                }`}
                icon="i-ph-user-bold"
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
                    icon="i-woot-captain"
                    onClick={handleCopilotSidebarToggle}
                />
            ) : null}
        </div>
    );
}
