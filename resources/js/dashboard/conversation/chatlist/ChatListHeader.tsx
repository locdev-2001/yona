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

    const filterTeleportTarget = (
        <div
            id="conversationFilterTeleportTarget"
            className={`absolute z-50 mt-2 ${isOnExpandedLayout ? 'ltr:right-0 rtl:left-0' : ''}`}
        />
    );

    return (
        <div
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
                    <span className="px-2 py-1 my-0.5 mx-1 rounded-md capitalize bg-n-slate-3 text-xxs text-n-slate-12 shrink-0">
                        {t(`CHAT_LIST.CHAT_STATUS_FILTER_ITEMS.${activeStatus}.TEXT`)}
                    </span>
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
                {!hasAppliedFiltersOrActiveFolders ? <ConversationBasicFilter /> : null}
                <SwitchLayout isOnExpandedLayout={isOnExpandedLayout} onToggle={toggleConversationLayout} />
            </div>
        </div>
    );
}
