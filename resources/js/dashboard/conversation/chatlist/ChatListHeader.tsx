import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import NewYonaChatDialog from '../people/NewYonaChatDialog';
import { useRef, useState } from 'react';
import { isProductFeatureVisible } from 'shared/helpers/productVisibility';
import { formatNumber } from '@ext/utils';

import { t } from '../../../i18n';
import NextButton from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { useConversation } from '../ConversationContext';
import ChatListSearch from './ChatListSearch';
import ListFilterButton from './ListFilterButton';
import ListHeaderButton from './ListHeaderButton';

// Hàng đầu cột danh sách: Tìm · Lọc · Chọn nhiều · Soạn tin · ⋯. Lưu/sửa/xoá view
// chỉ hiện ở dải riêng khi đang dùng lọc nâng cao hoặc mở một view đã lưu.
interface ChatListHeaderProps {
    pageTitle: string;
    isOnExpandedLayout: boolean;
    hasAppliedFilters: boolean;
    activeFolderName?: string;
    allCount: number;
    isListLoading: boolean;
    isSelecting: boolean;
    onToggleSelection: () => void;
    onFiltersModal: () => void;
    onResetFilters: () => void;
    onAddFolders: () => void;
    onDeleteFolders: () => void;
}

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

export default function ChatListHeader({
    pageTitle,
    isOnExpandedLayout,
    hasAppliedFilters,
    activeFolderName,
    allCount,
    isListLoading,
    isSelecting,
    onToggleSelection,
    onFiltersModal,
    onResetFilters,
    onAddFolders,
    onDeleteFolders,
}: ChatListHeaderProps) {
    const hasActiveFolder = Boolean(activeFolderName);
    const isAdvancedActive = hasAppliedFilters || hasActiveFolder;
    const canManageViews = isProductFeatureVisible('conversationViews');
    const anchorSide = isOnExpandedLayout ? 'end-3' : 'start-3';
    const newYonaChatRef = useRef<DialogHandle>(null);

    return (
        <>
            <div className="relative px-3 pt-3 pb-2">
                <h1 className="sr-only">{pageTitle}</h1>
                <ChatListSearch
                    actions={
                        <>
                            <ListFilterButton
                                isOnExpandedLayout={isOnExpandedLayout}
                                isAdvancedActive={isAdvancedActive}
                                onOpenAdvancedFilters={onFiltersModal}
                            />
                            <ListHeaderButton
                                icon="i-lucide-user-plus"
                                label={t('CHAT.NEW.TITLE')}
                                onClick={() => newYonaChatRef.current?.open()}
                            />
                            <ListHeaderButton
                                icon={isSelecting ? 'i-lucide-x' : 'i-lucide-list-checks'}
                                label={t(isSelecting ? 'CHAT_LIST.SELECTION_MODE.EXIT' : 'CHAT_LIST.SELECTION_MODE.START')}
                                isActive={isSelecting}
                                aria-pressed={isSelecting}
                                onClick={onToggleSelection}
                            />
                        </>
                    }
                    trailing={<ListMoreMenu isOnExpandedLayout={isOnExpandedLayout} />}
                />
                <NewYonaChatDialog ref={newYonaChatRef} />
                <div id="conversationFilterTeleportTarget" className={`absolute top-full z-50 ${anchorSide}`} />
            </div>
            {isAdvancedActive ? (
                <div className="relative flex items-center gap-1 min-w-0 px-3 pb-2">
                    <p className="flex-1 min-w-0 m-0 text-sm font-medium truncate text-n-slate-12" title={activeFolderName}>
                        {activeFolderName || t('CHAT_LIST.FILTER_PANEL.ADVANCED')}
                    </p>
                    {allCount > 0 && !isListLoading ? (
                        <span className="px-1.5 rounded bg-n-slate-3 text-xs tabular-nums text-n-slate-12 shrink-0" title={String(allCount)}>
                            {formatNumber(allCount)}
                        </span>
                    ) : null}
                    {hasActiveFolder ? (
                        canManageViews ? (
                            <>
                                <NextButton
                                    title={t('FILTER.CUSTOM_VIEWS.EDIT.EDIT_BUTTON')}
                                    icon="i-lucide-pen-line"
                                    slate
                                    xs
                                    faded
                                    className="max-md:!size-11"
                                    onClick={onFiltersModal}
                                />
                                <NextButton
                                    title={t('FILTER.CUSTOM_VIEWS.DELETE.DELETE_BUTTON')}
                                    icon="i-lucide-trash-2"
                                    ruby
                                    xs
                                    faded
                                    className="max-md:!size-11"
                                    onClick={onDeleteFolders}
                                />
                            </>
                        ) : null
                    ) : (
                        <>
                            {canManageViews ? (
                                <NextButton
                                    title={t('FILTER.CUSTOM_VIEWS.ADD.SAVE_BUTTON')}
                                    icon="i-lucide-save"
                                    slate
                                    xs
                                    faded
                                    className="max-md:!size-11"
                                    onClick={onAddFolders}
                                />
                            ) : null}
                            <NextButton
                                title={t('FILTER.CLEAR_BUTTON_LABEL')}
                                icon="i-lucide-circle-x"
                                ruby
                                faded
                                xs
                                className="max-md:!size-11"
                                onClick={onResetFilters}
                            />
                        </>
                    )}
                    <div id="saveFilterTeleportTarget" className={`absolute top-full z-50 ${anchorSide}`} />
                </div>
            ) : null}
        </>
    );
}
