import { isProductFeatureVisible } from 'shared/helpers/productVisibility';
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import { t } from '../../../i18n';
import NextButton from 'dashboard/components-next/button/Button';
import SelectMenu from 'dashboard/components-next/selectmenu/SelectMenu';
import { useConversation } from '../ConversationContext';
import type { ConversationStatusFilter } from '../types';

const STATUS_OPTION_VALUES = ['open', 'resolved', 'pending', 'snoozed', 'all'] as const;

const SORT_OPTION_VALUES = [
    'last_activity_at_asc',
    'last_activity_at_desc',
    'created_at_desc',
    'created_at_asc',
    'unread',
    'priority_desc',
    'priority_asc',
    'priority_desc_created_at_asc',
    'waiting_since_asc',
    'waiting_since_desc',
] as const;

// Port từ dashboard/components/widgets/conversation/ConversationBasicFilter.vue —
// v-on-click-outside thay bằng listener mousedown trên document; lưu lựa chọn
// vào ui_settings.conversations_filter_by như useUISettings gốc.
interface ConversationBasicFilterProps {
    isOnExpandedLayout?: boolean;
    // Bảng chọn này còn được mở từ pill trạng thái cạnh tiêu đề (ChatListHeader),
    // nên trạng thái đóng/mở do phía trên giữ; không truyền thì tự quản như cũ.
    isOpen?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    // Vùng "bấm ra ngoài thì đóng". Mặc định là chính nút này; khi có thêm nút mở
    // ở nơi khác thì phía trên truyền vùng bao cả hai vào.
    dismissBoundaryRef?: RefObject<HTMLElement | null>;
}

export default function ConversationBasicFilter({
    isOnExpandedLayout = false,
    isOpen,
    onOpenChange,
    dismissBoundaryRef,
}: ConversationBasicFilterProps) {
    const { status, sortBy, setStatusFilter, setSortFilter } = useConversation();
    const [ownDropdownOpen, setOwnDropdownOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const showActionsDropdown = isOpen ?? ownDropdownOpen;
    const setShowActionsDropdown = onOpenChange ?? setOwnDropdownOpen;

    useEffect(() => {
        if (!showActionsDropdown) return undefined;

        const handleClickAway = (event: globalThis.MouseEvent) => {
            const boundary = dismissBoundaryRef?.current ?? rootRef.current;
            if (!boundary?.contains(event.target as Node)) setShowActionsDropdown(false);
        };
        document.addEventListener('mousedown', handleClickAway);

        return () => document.removeEventListener('mousedown', handleClickAway);
    }, [showActionsDropdown, setShowActionsDropdown, dismissBoundaryRef]);

    const chatStatusOptions = STATUS_OPTION_VALUES.map(value => ({
        label: t(`CHAT_LIST.CHAT_STATUS_FILTER_ITEMS.${value}.TEXT`),
        value,
    }));

    const chatSortOptions = SORT_OPTION_VALUES.map(value => ({
        label: t(`CHAT_LIST.SORT_ORDER_ITEMS.${value}.TEXT`),
        value,
    }));

    const visibleChatSortOptions = chatSortOptions.filter(
        option => !option.value.startsWith('priority_') || isProductFeatureVisible('conversationPriority'),
    );

    const activeChatStatusLabel = chatStatusOptions.find(option => option.value === status)?.label || '';
    const activeChatSortLabel = chatSortOptions.find(option => option.value === sortBy)?.label || '';

    // Việc lưu vào ui_settings nằm trong ConversationContext (một điểm ghi cho cả
    // cụm conversations_filter_by, gồm cả tab người phụ trách).
    const handleStatusChange = (value: string) => {
        setStatusFilter(value as ConversationStatusFilter);
    };

    const handleSortChange = (value: string) => {
        setSortFilter(value);
    };

    return (
        <div ref={rootRef} className="relative flex">
            <NextButton
                title={t('CHAT_LIST.SORT_TOOLTIP_LABEL')}
                icon="i-lucide-arrow-up-down"
                slate
                faded
                xs
                onClick={() => setShowActionsDropdown(!showActionsDropdown)}
            />
            {showActionsDropdown ? (
                <div
                    className={[
                        'mt-1 overlay-surface w-72 rounded-xl p-4 absolute z-40 top-full',
                        !isOnExpandedLayout ? 'ltr:left-0 rtl:right-0' : 'ltr:right-0 rtl:left-0',
                    ].join(' ')}
                >
                    <div className="flex items-center justify-between last:mt-4 gap-2">
                        <span className="text-sm truncate text-n-slate-12">{t('CHAT_LIST.CHAT_SORT.STATUS')}</span>
                        <SelectMenu
                            value={status}
                            options={chatStatusOptions}
                            label={activeChatStatusLabel}
                            subMenuPosition={isOnExpandedLayout ? 'left' : 'right'}
                            onChange={handleStatusChange}
                        />
                    </div>
                    <div className="flex items-center justify-between last:mt-4 gap-2">
                        <span className="text-sm truncate text-n-slate-12">{t('CHAT_LIST.CHAT_SORT.ORDER_BY')}</span>
                        <SelectMenu
                            value={sortBy}
                            options={visibleChatSortOptions}
                            label={activeChatSortLabel}
                            subMenuPosition={isOnExpandedLayout ? 'left' : 'right'}
                            onChange={handleSortChange}
                        />
                    </div>
                </div>
            ) : null}
        </div>
    );
}
