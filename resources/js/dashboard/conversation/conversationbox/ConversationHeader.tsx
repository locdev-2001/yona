import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import BackButton from 'dashboard/components/widgets/BackButton';
import { useIsLargeScreen } from 'dashboard/composables/useViewportWidth';
import { useRef } from 'react';

import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';
import GroupInfoDialog from '../group/GroupInfoDialog';
import { presenceLabel } from '../presence';
import SearchMessagesDialog from './SearchMessagesDialog';
import ChatActionsMenu from './ChatActionsMenu';

// Mũ khung chat: quay lại (bố cục hai-màn), avatar + tên + @username người bên kia,
// menu thao tác (chặn, báo cáo, xoá). Dưới ngưỡng ba cột mũ gom về một dòng.
const CHAT_LIST_PATH = '/chat';

export default function ConversationHeader({
    className = '',
    showBackButton = false,
}: {
    className?: string;
    showBackButton?: boolean;
}) {
    const { selectedConversation } = useConversation();
    const isWideLayout = useIsLargeScreen();
    const groupInfoRef = useRef<DialogHandle>(null);
    const searchRef = useRef<DialogHandle>(null);

    if (!selectedConversation) return null;

    const isGroup = selectedConversation.kind === 'group';
    const currentContact = selectedConversation.meta.sender;
    const subtitle = isGroup
        ? t('CHAT.GROUP.MEMBERS', { count: selectedConversation.member_count })
        : (presenceLabel(selectedConversation.counterpart_last_seen_at) ??
          (currentContact.username ? `@${currentContact.username}` : null));
    const openGroupInfo = isGroup ? () => groupInfoRef.current?.open() : undefined;
    const avatar = (
        <Avatar
            name={currentContact.name ?? ''}
            seed={avatarSeed(isGroup ? 'chat' : 'user', isGroup ? selectedConversation.id : currentContact.id)}
            src={currentContact.thumbnail}
            size={36}
            previewable={!isGroup}
        />
    );
    const dialogs = (
        <>
            {isGroup ? <GroupInfoDialog ref={groupInfoRef} /> : null}
            <SearchMessagesDialog ref={searchRef} />
        </>
    );
    const openSearch = () => searchRef.current?.open();

    if (!isWideLayout) {
        return (
            <div
                data-testid="conversation-header"
                className={`flex flex-row items-center justify-between gap-2 flex-none w-full min-w-0 px-2 h-12 max-md:h-14 border-b border-n-weak bg-n-surface-panel ${className}`}
            >
                <div className="flex items-center justify-start min-w-0 flex-1 gap-2">
                    {showBackButton ? <BackButton backUrl={CHAT_LIST_PATH} isIconOnlyBelowMd /> : null}
                    <button type="button" disabled={!isGroup} className="flex items-center gap-2 min-w-0 text-start" onClick={openGroupInfo}>
                        {avatar}
                        <span className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate leading-tight text-n-slate-12">{currentContact.name}</span>
                            {subtitle ? <span className="text-xs truncate text-n-slate-11">{subtitle}</span> : null}
                        </span>
                    </button>
                </div>
                <div className="flex flex-row items-center justify-end flex-shrink-0 gap-1 header-actions-wrap">
                    <ChatActionsMenu triggerClassName="max-md:!size-11" onOpenGroupInfo={openGroupInfo} onOpenSearch={openSearch} />
                </div>
                {dialogs}
            </div>
        );
    }

    return (
        <div
            data-testid="conversation-header"
            className={`relative z-10 flex flex-none flex-row gap-3 items-center justify-between w-full min-w-0 px-4 h-16 bg-n-surface-panel shadow-bar ${className}`}
        >
            <div className="flex items-center justify-start flex-1 max-w-full min-w-0">
                {showBackButton ? <BackButton backUrl={CHAT_LIST_PATH} className="me-2" /> : null}
                <button type="button" disabled={!isGroup} className="flex items-center min-w-0 text-start" onClick={openGroupInfo}>
                    {avatar}
                    <span className="flex flex-col items-start min-w-0 ms-2 overflow-hidden">
                        <span className="text-sm font-medium truncate leading-tight text-n-slate-12">{currentContact.name}</span>
                        {subtitle ? <span className="text-xs truncate text-n-slate-11">{subtitle}</span> : null}
                    </span>
                </button>
            </div>
            <div className="flex flex-row items-center justify-end flex-shrink-0 gap-2 header-actions-wrap">
                <ChatActionsMenu onOpenGroupInfo={openGroupInfo} onOpenSearch={openSearch} />
            </div>
            {dialogs}
        </div>
    );
}
