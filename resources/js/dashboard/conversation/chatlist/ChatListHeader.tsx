import { t } from '../../../i18n';
import NextButton from 'dashboard/components-next/button/Button';
import type { ConversationStatusFilter } from '../types';
import { useConversation } from '../ConversationContext';
import ConversationBasicFilter from './ConversationBasicFilter';
import SwitchLayout from './SwitchLayout';

// Port từ dashboard/components/ChatListHeader.vue — nhánh applied filters /
// custom folders cắt khỏi B3 (E1) nên chỉ còn nhánh mặc định: chip status +
// nút filter (mở ConversationFilter) + basic filter + switch layout.
interface ChatListHeaderProps {
    pageTitle: string;
    activeStatus: ConversationStatusFilter;
    isOnExpandedLayout: boolean;
    onFiltersModal: () => void;
}

export default function ChatListHeader({ pageTitle, activeStatus, isOnExpandedLayout, onFiltersModal }: ChatListHeaderProps) {
    const { toggleConversationLayout } = useConversation();

    return (
        <div className="flex items-center justify-between gap-2 px-3 h-[3.25rem]">
            <div className="flex items-center justify-center min-w-0">
                <h1 className="text-base font-medium truncate text-n-slate-12" title={pageTitle}>
                    {pageTitle}
                </h1>
                <span className="px-2 py-1 my-0.5 mx-1 rounded-md capitalize bg-n-slate-3 text-xxs text-n-slate-12 shrink-0">
                    {t(`CHAT_LIST.CHAT_STATUS_FILTER_ITEMS.${activeStatus}.TEXT`)}
                </span>
            </div>
            <div className="flex items-center gap-1">
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
                    <div
                        id="conversationFilterTeleportTarget"
                        className={`absolute z-50 mt-2 ${isOnExpandedLayout ? 'ltr:right-0 rtl:left-0' : ''}`}
                    />
                </div>
                <ConversationBasicFilter />
                <SwitchLayout isOnExpandedLayout={isOnExpandedLayout} onToggle={toggleConversationLayout} />
            </div>
        </div>
    );
}
