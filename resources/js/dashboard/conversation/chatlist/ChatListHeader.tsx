import { useRef, useState } from 'react';

import { t } from '../../../i18n';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { useConversation } from '../ConversationContext';
import ChatListSearch from './ChatListSearch';
import ListHeaderButton from './ListHeaderButton';

// Hàng đầu cột danh sách: Tìm · Nhắn tin mới · ⋯ (đổi bố cục).
const TOGGLE_LAYOUT_ACTION = 'toggle_layout';

function ListMoreMenu({ isOnExpandedLayout }: { isOnExpandedLayout: boolean }) {
    const { toggleConversationLayout } = useConversation();
    const [isOpen, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    useClickAway(rootRef, () => setOpen(false), isOpen);

    return (
        // Đổi bố cục chỉ có nghĩa trên màn rộng; điện thoại luôn một cột.
        <div
            ref={rootRef}
            className="relative max-md:hidden"
            onKeyDown={event => {
                if (event.key === 'Escape') setOpen(false);
            }}
        >
            <ListHeaderButton
                icon="i-lucide-ellipsis"
                label={t('CHAT_LIST.MORE_ACTIONS')}
                isActive={isOpen}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={() => setOpen(open => !open)}
            />
            {isOpen ? (
                <DropdownMenu
                    menuItems={[
                        {
                            label: t('CONVERSATION.SWITCH_VIEW_LAYOUT'),
                            value: TOGGLE_LAYOUT_ACTION,
                            action: TOGGLE_LAYOUT_ACTION,
                            icon: isOnExpandedLayout ? 'i-lucide-arrow-left-to-line' : 'i-lucide-arrow-right-to-line',
                        },
                    ]}
                    className="top-full mt-1 end-0 w-max"
                    onAction={() => {
                        setOpen(false);
                        toggleConversationLayout();
                    }}
                />
            ) : null}
        </div>
    );
}

export default function ChatListHeader({ pageTitle, isOnExpandedLayout }: { pageTitle: string; isOnExpandedLayout: boolean }) {
    return (
        <div className="relative px-3 pt-3 pb-2">
            <h1 className="sr-only">{pageTitle}</h1>
            <ChatListSearch trailing={<ListMoreMenu isOnExpandedLayout={isOnExpandedLayout} />} />
        </div>
    );
}
