import { useRef, useState } from 'react';
import { formatNumber } from '@chatwoot/utils';

import { t } from '../../../i18n';
import NextButton from 'dashboard/components-next/button/Button';
import type { ConversationStatusFilter } from '../types';
import { useConversation } from '../ConversationContext';
import ConversationBasicFilter from './ConversationBasicFilter';
import SwitchLayout from './SwitchLayout';

// Port từ dashboard/components/ChatListHeader.vue.
interface ChatListHeaderProps {
    pageTitle: string;
    activeStatus: ConversationStatusFilter;
    isOnExpandedLayout: boolean;
    hasAppliedFilters: boolean;
    hasActiveFolders: boolean;
    allCount: number;
    isListLoading: boolean;
    onFiltersModal: () => void;
    onResetFilters: () => void;
    onAddFolders: () => void;
    onDeleteFolders: () => void;
}

export default function ChatListHeader({
    pageTitle,
    activeStatus,
    isOnExpandedLayout,
    hasAppliedFilters,
    hasActiveFolders,
    allCount,
    isListLoading,
    onFiltersModal,
    onResetFilters,
    onAddFolders,
    onDeleteFolders,
}: ChatListHeaderProps) {
    const { toggleConversationLayout } = useConversation();
    const hasAppliedFiltersOrActiveFolders = hasAppliedFilters || hasActiveFolders;
    // LỆCH CÓ CHỦ ĐÍCH so với Chatwoot: pill trạng thái cạnh tiêu đề là nhãn tĩnh
    // ở gốc, ở đây nó mở luôn bảng lọc trạng thái (xem reports/ux-deviations.md).
    const [isStatusFilterOpen, setStatusFilterOpen] = useState(false);
    const headerRef = useRef<HTMLDivElement>(null);

    const filterTeleportTarget = (
        <div
            id="conversationFilterTeleportTarget"
            className={`absolute z-50 mt-2 ${isOnExpandedLayout ? 'ltr:right-0 rtl:left-0' : ''}`}
        />
    );

    return (
        <div
            ref={headerRef}
            className={`flex items-center justify-between gap-2 px-3 h-[3.25rem] ${
                hasAppliedFiltersOrActiveFolders ? 'border-b border-n-strong' : ''
            }`}
        >
            <div className="flex items-center justify-center min-w-0">
                <h1 className="text-base font-medium truncate text-n-slate-12" title={pageTitle}>
                    {pageTitle}
                </h1>
                {allCount > 0 && hasAppliedFiltersOrActiveFolders && !isListLoading ? (
                    <span
                        className="px-2 py-1 my-0.5 mx-1 rounded-md capitalize bg-n-slate-3 text-xxs text-n-slate-12 shrink-0"
                        title={String(allCount)}
                    >
                        {formatNumber(allCount)}
                    </span>
                ) : null}
                {!hasAppliedFiltersOrActiveFolders ? (
                    <button
                        type="button"
                        title={t('CHAT_LIST.STATUS_FILTER_TOOLTIP_LABEL')}
                        aria-label={t('CHAT_LIST.STATUS_FILTER_TOOLTIP_LABEL')}
                        aria-expanded={isStatusFilterOpen}
                        className="flex items-center gap-1 px-2 py-1 my-0.5 mx-1 rounded-md capitalize bg-n-slate-3 hover:bg-n-slate-4 text-xxs text-n-slate-12 shrink-0 cursor-pointer transition-colors duration-150"
                        onClick={() => setStatusFilterOpen(open => !open)}
                    >
                        {t(`CHAT_LIST.CHAT_STATUS_FILTER_ITEMS.${activeStatus}.TEXT`)}
                        <span className="i-lucide-chevron-down size-3 shrink-0" aria-hidden="true" />
                    </button>
                ) : null}
            </div>
            <div className="flex items-center gap-1">
                {hasAppliedFilters && !hasActiveFolders ? (
                    <>
                        <div className="relative">
                            <NextButton
                                title={t('FILTER.CUSTOM_VIEWS.ADD.SAVE_BUTTON')}
                                icon="i-lucide-save"
                                slate
                                xs
                                faded
                                onClick={onAddFolders}
                            />
                            <div
                                id="saveFilterTeleportTarget"
                                className={`absolute z-50 mt-2 ${isOnExpandedLayout ? 'ltr:right-0 rtl:left-0' : ''}`}
                            />
                        </div>
                        <NextButton
                            title={t('FILTER.CLEAR_BUTTON_LABEL')}
                            icon="i-lucide-circle-x"
                            ruby
                            faded
                            xs
                            onClick={onResetFilters}
                        />
                    </>
                ) : null}
                {hasActiveFolders ? (
                    <>
                        <div className="relative">
                            <NextButton
                                id="toggleConversationFilterButton"
                                title={t('FILTER.CUSTOM_VIEWS.EDIT.EDIT_BUTTON')}
                                icon="i-lucide-pen-line"
                                slate
                                xs
                                faded
                                onClick={onFiltersModal}
                            />
                            {filterTeleportTarget}
                        </div>
                        <NextButton
                            id="toggleConversationFilterButton"
                            title={t('FILTER.CUSTOM_VIEWS.DELETE.DELETE_BUTTON')}
                            icon="i-lucide-trash-2"
                            ruby
                            xs
                            faded
                            onClick={onDeleteFolders}
                        />
                    </>
                ) : (
                    <div className="relative">
                        <NextButton
                            id="toggleConversationFilterButton"
                            title={t('FILTER.TOOLTIP_LABEL')}
                            icon="i-lucide-list-filter"
                            slate
                            xs
                            faded
                            onClick={onFiltersModal}
                        />
                        {filterTeleportTarget}
                    </div>
                )}
                {!hasAppliedFiltersOrActiveFolders ? (
                    <ConversationBasicFilter
                        isOpen={isStatusFilterOpen}
                        onOpenChange={setStatusFilterOpen}
                        dismissBoundaryRef={headerRef}
                    />
                ) : null}
                <SwitchLayout isOnExpandedLayout={isOnExpandedLayout} onToggle={toggleConversationLayout} />
            </div>
        </div>
    );
}
