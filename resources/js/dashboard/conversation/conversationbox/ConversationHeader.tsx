import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import BackButton from 'dashboard/components/widgets/BackButton';
import Button from 'dashboard/components-next/button/Button';
import { conversationListPageURL } from 'dashboard/helper/URLHelper';
import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon';
import { useAlert } from 'dashboard/composables/useAlert';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { snoozedReopenTime } from 'dashboard/helper/snoozeHelpers';
import { useIsLargeScreen } from 'dashboard/composables/useViewportWidth';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { STATUS_TYPE } from '../constants';
import { useConversation } from '../ConversationContext';
import { useContactAvailabilityStatus } from 'dashboard/realtime/hooks';
import type { AvailabilityStatus } from 'dashboard/constants/globals';
import MoreActions from './MoreActions';
import SidepanelSwitch from './SidepanelSwitch';
import ConversationSearchBar from './search/ConversationSearchBar';

// Port từ widgets/conversation/ConversationHeader.vue. Bỏ ở B3: SLACardLabel
// (EE), ConversationCallButton (voice EE), cảnh báo HMAC unverified (chỉ áp
// dụng WebWidget — C3). BackButton hiện ở expanded layout.
//
// Lệch có chủ đích (founder 08/09/2026, ux-deviations.md): dưới ngưỡng ba cột
// (LARGE_SCREEN_BREAKPOINT) mũ khung chat gom về MỘT dòng thay vì hai — nền tảng
// nằm ở badge của avatar, hành động thu thành nút icon, mã hội thoại nhường chỗ.
// Từ 1280px trở lên giữ nguyên bản gốc từng pixel.
export default function ConversationHeader({
    className = '',
    showBackButton = false,
}: {
    className?: string;
    showBackButton?: boolean;
}) {
    const { selectedConversation, accountId, inboxId, teamId, label } = useConversation();
    const { inboxes = [] } = usePage<DashboardPageProps>().props;
    const isWideLayout = useIsLargeScreen();
    const [isSearchOpen, setSearchOpen] = useState(false);
    const selectedConversationId = selectedConversation?.id;

    useEffect(() => setSearchOpen(false), [selectedConversationId]);

    if (!selectedConversation) return null;

    const closeSearch = () => setSearchOpen(false);
    const searchButton = (
        <Button
            ghost
            slate
            sm
            icon="i-lucide-search"
            title={t('CONVERSATION.SEARCH_IN_CONVERSATION.OPEN')}
            className="!rounded-full"
            onClick={() => setSearchOpen(true)}
        />
    );

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

    if (!isWideLayout && isSearchOpen) {
        return (
            <div
                data-testid="conversation-header"
                className={`flex flex-row items-center flex-1 w-full min-w-0 px-2 h-12 ${className}`}
            >
                <ConversationSearchBar onClose={closeSearch} />
            </div>
        );
    }

    if (!isWideLayout) {
        return (
            <div
                data-testid="conversation-header"
                className={`flex flex-row items-center justify-between gap-2 flex-1 w-full min-w-0 px-2 h-12 ${className}`}
            >
                <div className="flex items-center justify-start min-w-0 flex-1 gap-2">
                    {showBackButton ? (
                        <BackButton backUrl={conversationListPageURL({ accountId, inboxId, teamId, label })} />
                    ) : null}
                    <Avatar
                        name={currentContact.name ?? ''}
                        seed={avatarSeed('contact', currentContact.id)}
                        src={currentContact.thumbnail}
                        size={36}
                        status={contactAvailabilityStatus}
                        platform={inbox?.platform ?? null}
                        hideOfflineStatus
                        previewable
                    />
                    <div className="flex items-center min-w-0 gap-1.5">
                        <span className="text-sm font-medium truncate leading-tight text-n-slate-12">
                            {currentContact.name}
                        </span>
                        {isSnoozed ? (
                            <span title={snoozedDisplayText} className="i-lucide-alarm-clock size-4 flex-shrink-0 text-n-amber-10" />
                        ) : null}
                    </div>
                </div>
                <div className="flex flex-row items-center justify-end flex-shrink-0 gap-1 header-actions-wrap">
                    {searchButton}
                    <SidepanelSwitch />
                    <MoreActions isCompact />
                </div>
            </div>
        );
    }

    return (
        <div
            data-testid="conversation-header"
            className={`relative z-10 flex flex-col gap-3 items-center justify-between flex-1 w-full min-w-0 xl:flex-row px-3 pt-3 pb-2 h-24 xl:h-12 bg-n-surface-panel shadow-bar ${className}`}
        >
            <div className="flex items-center justify-start w-full xl:w-auto max-w-full min-w-0 xl:flex-1">
                {showBackButton ? (
                    <BackButton backUrl={conversationListPageURL({ accountId, inboxId, teamId, label })} className="me-2" />
                ) : null}
                <Avatar
                    name={currentContact.name ?? ''}
                    seed={avatarSeed('contact', currentContact.id)}
                    src={currentContact.thumbnail}
                    size={36}
                    status={contactAvailabilityStatus}
                    platform={inbox?.platform ?? null}
                    hideOfflineStatus
                    previewable
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
                            className="shrink-0 tabular-nums text-label-small text-n-slate-11 hover:text-n-slate-12 !p-0 cursor-pointer"
                            onClick={copyConversationId}
                        >
                            {`#${selectedConversation.id}`}
                        </button>
                        {hasMultipleInboxes && inbox ? <span className="shrink-0">•</span> : null}
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
            {isSearchOpen ? (
                <div className="flex items-center flex-shrink-0 w-full xl:w-[26rem] xl:max-w-[50%]">
                    <ConversationSearchBar onClose={closeSearch} />
                </div>
            ) : (
                <div className="flex flex-row items-center justify-start xl:justify-end flex-shrink-0 gap-2 w-full xl:w-auto header-actions-wrap">
                    {searchButton}
                    <MoreActions />
                    <SidepanelSwitch />
                </div>
            )}
        </div>
    );
}
