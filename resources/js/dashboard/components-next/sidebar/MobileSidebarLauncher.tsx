import { usePage } from '@inertiajs/react';

import Icon from 'dashboard/components-next/icon/Icon';
import { useNotificationsUnreadCount } from 'dashboard/notifications/useUnreadCount';
import { t } from '../../../i18n';
import { MOBILE_DRAWER_WIDTH } from './provider';

const LAUNCHER_EDGE_GAP = 16;

// Port từ sidebar/MobileSidebarLauncher.vue
interface MobileSidebarLauncherProps {
    isMobileSidebarOpen: boolean;
    onToggle: () => void;
}

export default function MobileSidebarLauncher({ isMobileSidebarOpen, onToggle }: MobileSidebarLauncherProps) {
    // Gốc ẩn nút này trên mọi route hội thoại (`v-if="!isConversationRoute"`).
    // Yona chỉ ẩn khi ĐANG mở một hội thoại: lúc đó nút nổi góc dưới đè lên ô
    // soạn tin, và đường về thanh điều hướng là nút quay lại danh sách. Màn danh
    // sách của cùng route đó vẫn cần nút để mở thanh điều hướng.
    const { conversationId } = usePage().props as { conversationId?: number | null };
    // Chuông nằm trong ngăn kéo; chấm đỏ báo có thông báo mà không phải mở ngăn kéo.
    const hasUnreadNotifications = useNotificationsUnreadCount() > 0;

    if (conversationId) return null;

    return (
        <button
            id="mobile-sidebar-launcher"
            type="button"
            aria-label={hasUnreadNotifications ? t('INBOX.BELL.LAUNCHER_UNREAD') : undefined}
            // Khi ngăn kéo mở, nút đóng dời ra ngoài mép ngăn kéo để không đè lên hồ sơ ở đáy.
            style={{ insetInlineStart: LAUNCHER_EDGE_GAP + (isMobileSidebarOpen ? MOBILE_DRAWER_WIDTH : 0) }}
            className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] z-50 transition-[inset-inline-start] duration-200 ease-out flex md:hidden items-center justify-center size-10 rounded-full overlay-surface text-n-slate-11"
            onClick={onToggle}
        >
            <Icon icon={isMobileSidebarOpen ? 'i-lucide-x' : 'i-lucide-menu'} className="size-5" />
            {hasUnreadNotifications ? (
                <span
                    data-test-id="mobile-launcher-unread-dot"
                    className="absolute top-1.5 ltr:right-1.5 rtl:left-1.5 size-2.5 rounded-full bg-n-ruby-9 ring-1 ring-n-surface-raised"
                />
            ) : null}
        </button>
    );
}
