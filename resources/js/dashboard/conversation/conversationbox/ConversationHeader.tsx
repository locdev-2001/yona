import { usePage } from '@inertiajs/react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import BackButton from 'dashboard/components/widgets/BackButton';
import { conversationListPageURL } from 'dashboard/helper/URLHelper';
import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon';
import { useAlert } from 'dashboard/composables/useAlert';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { snoozedReopenTime } from 'dashboard/helper/snoozeHelpers';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { STATUS_TYPE } from '../constants';
import { useConversation } from '../ConversationContext';
import { useContactAvailabilityStatus } from 'dashboard/realtime/hooks';
import type { AvailabilityStatus } from 'dashboard/constants/globals';
import MoreActions from './MoreActions';

// Port từ widgets/conversation/ConversationHeader.vue. Bỏ ở B3: SLACardLabel
// (EE), ConversationCallButton (voice EE), cảnh báo HMAC unverified (chỉ áp
// dụng WebWidget — C3). BackButton hiện ở expanded layout.
export default function ConversationHeader({
    className = '',
    showBackButton = false,
}: {
    className?: string;
    showBackButton?: boolean;
}) {
    const { selectedConversation, accountId, inboxId, teamId, label } = useConversation();
    const { inboxes = [] } = usePage<DashboardPageProps>().props;

    if (!selectedConversation) return null;

    const currentContact = selectedConversation.meta.sender;
    const contactAvailabilityStatus = useContactAvailabilityStatus(
        currentContact.id,
        currentContact.availability_status as AvailabilityStatus | undefined,
    );
    const inbox = inboxes.find(item => item.id === selectedConversation.inbox_id);
    const hasMultipleInboxes = inboxes.length > 1;
    const isSnoozed = selectedConversation.status === STATUS_TYPE.SNOOZED;

    const snoozedDisplayText = selectedConversation.snoozed_until
        ? `${t('CONVERSATION.HEADER.SNOOZED_UNTIL')} ${snoozedReopenTime(selectedConversation.snoozed_until)}`
        : t('CONVERSATION.HEADER.SNOOZED_UNTIL_NEXT_REPLY');

    const copyConversationId = async () => {
        try {
            await copyTextToClipboard(String(selectedConversation.id));
            useAlert(t('CONVERSATION.HEADER.COPY_ID_SUCCESS'));
        } catch {
            // Gốc nuốt lỗi clipboard (headless/không quyền) — không toast.
        }
    };

    return (
        <div
            className={`flex flex-col gap-3 items-center justify-between flex-1 w-full min-w-0 xl:flex-row px-3 pt-3 pb-2 h-24 xl:h-12 ${className}`}
        >
            <div className="flex items-center justify-start w-full xl:w-auto max-w-full min-w-0 xl:flex-1">
                {showBackButton ? (
                    <BackButton backUrl={conversationListPageURL({ accountId, inboxId, teamId, label })} className="me-2" />
                ) : null}
                <Avatar
                    name={currentContact.name ?? ''}
                    src={currentContact.thumbnail}
                    size={32}
                    status={contactAvailabilityStatus}
                    hideOfflineStatus
                />
                <div className="flex flex-col items-start min-w-0 ms-2 overflow-hidden">
                    <div className="flex flex-row items-center max-w-full gap-1 p-0 m-0">
                        <span className="text-sm font-medium truncate leading-tight text-n-slate-12">
                            {currentContact.name}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 overflow-hidden text-xs conversation--header--actions text-n-slate-11 text-ellipsis whitespace-nowrap">
                        <button
                            type="button"
                            className="truncate text-label-small text-n-slate-11 hover:text-n-slate-12 !p-0 cursor-pointer"
                            onClick={copyConversationId}
                        >
                            {`#${selectedConversation.id}`}
                        </button>
                        {hasMultipleInboxes && inbox ? <span>•</span> : null}
                        {hasMultipleInboxes && inbox ? (
                            <div title={inbox.name} className="flex items-center gap-0.5 min-w-0 !mx-0">
                                <ChannelIcon inbox={inbox} className="size-4 flex-shrink-0 text-n-slate-11" />
                                <span className="truncate text-label-small text-n-slate-11">{inbox.name}</span>
                            </div>
                        ) : null}
                        {isSnoozed ? <span>•</span> : null}
                        {isSnoozed ? <span className="font-medium text-n-amber-10">{snoozedDisplayText}</span> : null}
                    </div>
                </div>
            </div>
            <div className="flex flex-row items-center justify-start xl:justify-end flex-shrink-0 gap-2 w-full xl:w-auto header-actions-wrap">
                <MoreActions />
            </div>
        </div>
    );
}
