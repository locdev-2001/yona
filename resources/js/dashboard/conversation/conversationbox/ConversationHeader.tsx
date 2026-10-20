import { isProductFeatureVisible } from 'shared/helpers/productVisibility';
import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import { conversationAvatarSeed } from 'shared/avatar/avatarSeed';
import BackButton from 'dashboard/components/widgets/BackButton';
import Button from 'dashboard/components-next/button/Button';
import { conversationListPageURL } from 'dashboard/helper/URLHelper';
import { openProfile } from 'dashboard/contacts/profile/profileOverlay';
import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon';
import { snoozedReopenTime } from 'dashboard/helper/snoozeHelpers';
import { useIsLargeScreen, useIsPhoneScreen } from 'dashboard/composables/useViewportWidth';
import { useObservedWidth } from 'dashboard/composables/useObservedWidth';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { STATUS_TYPE } from '../constants';
import { useConversation } from '../ConversationContext';
import { useContactAvailabilityStatus } from 'dashboard/realtime/hooks';
import type { AvailabilityStatus } from 'dashboard/constants/globals';
import AssigneeAction from './AssigneeAction';
import MoreActions from './MoreActions';
import ResolveAction from './ResolveAction';
import SidepanelSwitch from './SidepanelSwitch';
import { useContactPanelControl } from '../contactPanelVisibility';
import ConversationSearchBar from './search/ConversationSearchBar';

// Port từ widgets/conversation/ConversationHeader.vue. Bỏ ở B3: SLACardLabel
// (EE), ConversationCallButton (voice EE), cảnh báo HMAC unverified (chỉ áp
// dụng WebWidget — C3). BackButton hiện ở expanded layout.
//
// Lệch có chủ đích (founder 08/09/2026, ux-deviations.md): dưới ngưỡng ba cột
// (LARGE_SCREEN_BREAKPOINT) mũ khung chat gom về MỘT dòng thay vì hai — nền tảng
// nằm ở badge của avatar, hành động thu thành nút icon, mã hội thoại nhường chỗ.
// Từ 1280px trở lên giữ nguyên bản gốc từng pixel.
//
// Điện thoại (< 768px): người phụ trách và trạng thái xuống một dải hai nút 44px dưới
// mũ, có nhãn đầy đủ, menu mở dạng bottom sheet; mũ nhường chỗ cho tên khách.
//
// Ba cột + panel phải mở thì mũ còn ~460px dù khung nhìn rộng: dưới ngưỡng này nút
// phụ trách và trạng thái thu về avatar/chấm màu để tên khách không bị ép mất.
const FULL_ACTION_LABELS_MIN_WIDTH = 640;

const hasPhoneActionStrip = isProductFeatureVisible('conversationAssignment') || isProductFeatureVisible('conversationStatus');

export default function ConversationHeader({
    className = '',
    showBackButton = false,
}: {
    className?: string;
    showBackButton?: boolean;
}) {
    const { selectedConversation, accountId, listFilters, teamId, uiSettings, updateUISettings } = useConversation();
    const { setOpen: setSidePanelOpen } = useContactPanelControl(uiSettings, updateUISettings);
    const { inboxes = [] } = usePage<DashboardPageProps>().props;
    const isWideLayout = useIsLargeScreen();
    const isPhone = useIsPhoneScreen();
    const [isSearchOpen, setSearchOpen] = useState(false);
    const [wideHeaderRef, wideHeaderWidth] = useObservedWidth<HTMLDivElement>();
    const isActionsCompact = wideHeaderWidth > 0 && wideHeaderWidth < FULL_ACTION_LABELS_MIN_WIDTH;
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
            className="!rounded-full max-md:!size-11"
            onClick={() => setSearchOpen(true)}
        />
    );

    const currentContact = selectedConversation.meta.sender;
    const group = selectedConversation.group ?? null;
    // Tên nhóm mở panel thông tin nhóm; tên người mở hồ sơ.
    const openIdentity = () => (group ? setSidePanelOpen(true) : openProfile(currentContact.id));
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


    if (!isWideLayout) {
        const headerRow = isSearchOpen ? (
            <div
                data-testid="conversation-header"
                className={`flex flex-row items-center flex-1 w-full min-w-0 px-2 h-12 max-md:h-14 ${className}`}
            >
                <ConversationSearchBar onClose={closeSearch} />
            </div>
        ) : (
            <div
                data-testid="conversation-header"
                className={`flex flex-row items-center justify-between gap-2 flex-1 w-full min-w-0 px-2 h-12 max-md:h-14 ${className}`}
            >
                <div className="flex items-center justify-start min-w-0 flex-1 gap-2">
                    {showBackButton ? (
                        <BackButton
                            backUrl={conversationListPageURL({ accountId, filters: listFilters, teamId })}
                            isIconOnlyBelowMd
                        />
                    ) : null}
                    <Avatar
                        name={currentContact.name ?? ''}
                        seed={conversationAvatarSeed(group, currentContact.id)}
                        src={currentContact.thumbnail}
                        size={36}
                        status={contactAvailabilityStatus}
                        platform={inbox?.platform ?? null}
                        hideOfflineStatus
                        previewable
                    />
                    <div className="flex items-center min-w-0 gap-1.5">
                        <button
                            type="button"
                            className="min-w-0 text-sm font-medium truncate leading-tight text-start text-n-slate-12 hover:underline"
                            onClick={openIdentity}
                        >
                            {currentContact.name}
                        </button>
                        {isSnoozed ? (
                            <span title={snoozedDisplayText} className="i-lucide-alarm-clock size-4 flex-shrink-0 text-n-amber-10" />
                        ) : null}
                    </div>
                </div>
                <div className="flex flex-row items-center justify-end flex-shrink-0 gap-1 header-actions-wrap max-md:[&_[data-testid=sidepanel-switch]_button]:!size-11">
                    {searchButton}
                    <SidepanelSwitch />
                    {isPhone ? null : <AssigneeAction isCompact />}
                    <MoreActions isCompact showResolveAction={!isPhone} triggerClassName="max-md:!size-11" />
                </div>
            </div>
        );

        if (!isPhone || !hasPhoneActionStrip) return headerRow;

        return (
            <div className="flex flex-col flex-none w-full min-w-0 border-b border-n-weak bg-n-surface-panel">
                {headerRow}
                <div data-testid="conversation-action-strip" className="flex gap-2 px-3 pb-2">
                    <AssigneeAction isStretched />
                    <ResolveAction isStretched />
                </div>
            </div>
        );
    }

    return (
        <div
            ref={wideHeaderRef}
            data-testid="conversation-header"
            className={`relative z-10 flex flex-none flex-col gap-3 items-center justify-between w-full min-w-0 xl:flex-row px-4 py-3 h-28 xl:h-16 xl:py-0 bg-n-surface-panel shadow-bar ${className}`}
        >
            <div className="flex items-center justify-start w-full xl:w-auto max-w-full min-w-0 xl:flex-1">
                {showBackButton ? (
                    <BackButton backUrl={conversationListPageURL({ accountId, filters: listFilters, teamId })} className="me-2" />
                ) : null}
                <Avatar
                    name={currentContact.name ?? ''}
                    seed={conversationAvatarSeed(group, currentContact.id)}
                    src={currentContact.thumbnail}
                    size={36}
                    status={contactAvailabilityStatus}
                    platform={inbox?.platform ?? null}
                    hideOfflineStatus
                    previewable
                />
                <div className="flex flex-col items-start min-w-0 ms-2 overflow-hidden">
                    <div className="flex flex-row items-center max-w-full gap-1 p-0 m-0">
                        <button
                            type="button"
                            className="min-w-0 text-sm font-medium truncate leading-tight text-start text-n-slate-12 hover:underline"
                            onClick={openIdentity}
                        >
                            {currentContact.name}
                        </button>
                    </div>
                    <div className="flex items-center gap-1 overflow-hidden text-xs conversation--header--actions text-n-slate-11 text-ellipsis whitespace-nowrap">
                        {hasMultipleInboxes && inbox ? (
                            <div title={inbox.name} className="flex items-center gap-0.5 min-w-0 !mx-0">
                                <ChannelIcon inbox={inbox} className="size-4 flex-shrink-0 text-n-slate-11" />
                                <span className="truncate text-label-small text-n-slate-11">{inbox.name}</span>
                            </div>
                        ) : null}
                        {group ? <span>{t('CHAT.GROUP.MEMBERS', { count: group.member_count })}</span> : null}
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
                    <AssigneeAction isCompact={isActionsCompact} />
                    <MoreActions isCompact={isActionsCompact} />
                    <SidepanelSwitch />
                </div>
            )}
        </div>
    );
}
