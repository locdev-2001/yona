import { useRef, useState } from 'react';

import { useClickAway } from 'dashboard/composables/useClickAway';
import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';
import { countActiveListFilters } from '../listFilters';
import ListFilterPanel from './ListFilterPanel';
import ListHeaderButton from './ListHeaderButton';

// Vỏ popover của bảng Lọc trên máy tính. Bảng neo theo hàng đầu cột danh sách
// (phần tử `relative` gần nhất), không theo nút, để vừa bề rộng cột 340px.
interface ListFilterButtonProps {
    isOnExpandedLayout: boolean;
    // Đang dùng lọc nâng cao/view đã lưu: chip nhanh không áp lên danh sách đó, nút mở thẳng trình dựng.
    isAdvancedActive: boolean;
    onOpenAdvancedFilters: () => void;
}

export default function ListFilterButton({ isOnExpandedLayout, isAdvancedActive, onOpenAdvancedFilters }: ListFilterButtonProps) {
    const { listFilters } = useConversation();
    const [isOpen, setOpen] = useState(false);
    const rootRef = useRef<HTMLSpanElement>(null);
    useClickAway(rootRef, () => setOpen(false), isOpen);

    const activeCount = isAdvancedActive ? 0 : countActiveListFilters(listFilters);
    const label =
        activeCount > 0 ? t('CHAT_LIST.FILTER_PANEL.BUTTON_ACTIVE', { count: activeCount }) : t('CHAT_LIST.FILTER_PANEL.BUTTON');

    const openAdvancedFilters = () => {
        setOpen(false);
        onOpenAdvancedFilters();
    };

    return (
        <span
            ref={rootRef}
            className="contents"
            onKeyDown={event => {
                if (event.key === 'Escape' && isOpen) {
                    event.stopPropagation();
                    setOpen(false);
                }
            }}
        >
            <ListHeaderButton
                icon="i-lucide-list-filter"
                label={label}
                isActive={isOpen || activeCount > 0 || isAdvancedActive}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                badge={
                    activeCount > 0 ? (
                        <span
                            className="absolute -top-1 -end-1 grid place-content-center min-w-4 h-4 px-1 rounded-full bg-n-brand text-xxs leading-none text-white tabular-nums"
                            aria-hidden="true"
                        >
                            {activeCount}
                        </span>
                    ) : null
                }
                onClick={() => (isAdvancedActive ? onOpenAdvancedFilters() : setOpen(open => !open))}
            />
            {isOpen ? (
                <div
                    role="dialog"
                    aria-label={t('CHAT_LIST.FILTER_PANEL.TITLE')}
                    className={`absolute top-full mt-1 z-40 overlay-surface rounded-xl max-h-[min(32rem,70vh)] overflow-y-auto ${
                        isOnExpandedLayout ? 'end-3 w-80' : 'start-3 end-3'
                    }`}
                >
                    <ListFilterPanel onOpenAdvancedFilters={openAdvancedFilters} />
                </div>
            ) : null}
        </span>
    );
}
