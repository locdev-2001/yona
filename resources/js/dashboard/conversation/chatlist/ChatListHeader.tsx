import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import FindPeopleDialog from 'dashboard/friends/FindPeopleDialog';
import { useRef } from 'react';
import { isProductFeatureVisible } from 'shared/helpers/productVisibility';
import { formatNumber } from '@ext/utils';

import { t } from '../../../i18n';
import NextButton from 'dashboard/components-next/button/Button';
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
    onFiltersModal: () => void;
    onResetFilters: () => void;
    onAddFolders: () => void;
    onDeleteFolders: () => void;
}

export default function ChatListHeader({
    pageTitle,
    isOnExpandedLayout,
    hasAppliedFilters,
    activeFolderName,
    allCount,
    isListLoading,
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
    const { toggleConversationLayout } = useConversation();

    return (
        <>
            <div className="relative px-3 pt-2 pb-2">
                <div className="flex items-center justify-between gap-2 min-h-9 mb-1">
                    <h1 className="m-0 text-base font-medium truncate text-n-slate-12" title={pageTitle}>
                        {pageTitle}
                    </h1>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <ListHeaderButton
                            icon="i-lucide-user-plus"
                            label={t('CHAT.NEW.TITLE')}
                            onClick={() => newYonaChatRef.current?.open()}
                        />
                        <ListFilterButton
                            isOnExpandedLayout={isOnExpandedLayout}
                            isAdvancedActive={isAdvancedActive}
                            onOpenAdvancedFilters={onFiltersModal}
                        />
                        <ListHeaderButton
                            icon={isOnExpandedLayout ? 'i-lucide-arrow-left-to-line' : 'i-lucide-arrow-right-to-line'}
                            label={t('CONVERSATION.SWITCH_VIEW_LAYOUT')}
                            className="max-md:hidden rtl:rotate-180"
                            onClick={toggleConversationLayout}
                        />
                    </div>
                </div>
                <ChatListSearch />
                <FindPeopleDialog ref={newYonaChatRef} title={t('CHAT.NEW.TITLE')} description={t('CHAT.NEW.DESCRIPTION')} />
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
                                    className="max-md:!size-8"
                                    onClick={onFiltersModal}
                                />
                                <NextButton
                                    title={t('FILTER.CUSTOM_VIEWS.DELETE.DELETE_BUTTON')}
                                    icon="i-lucide-trash-2"
                                    ruby
                                    xs
                                    faded
                                    className="max-md:!size-8"
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
                                    className="max-md:!size-8"
                                    onClick={onAddFolders}
                                />
                            ) : null}
                            <NextButton
                                title={t('FILTER.CLEAR_BUTTON_LABEL')}
                                icon="i-lucide-circle-x"
                                ruby
                                faded
                                xs
                                className="max-md:!size-8"
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
