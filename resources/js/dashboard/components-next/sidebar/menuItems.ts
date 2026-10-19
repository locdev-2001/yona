import { t } from '../../../i18n';
import type { SidebarMenuItem } from './provider';

export const CHAT_HOME_PATH = '/chat';
export const CHAT_PROFILE_PATH = '/chat/profile';

// Menu của app nhắn tin. Thanh bên, thanh tab điện thoại và lệnh "đi tới" của
// Ctrl+K cùng dựng từ đây, nên thêm mục ở đây là cả ba nơi đều có.
export function buildMenuItems(): SidebarMenuItem[] {
    return [
        {
            name: 'Conversation',
            label: t('PEOPLE.CHAT.TITLE'),
            icon: 'i-lucide-message-circle',
            to: CHAT_HOME_PATH,
            activeOn: [CHAT_HOME_PATH, `${CHAT_HOME_PATH}/c`],
        },
    ];
}
