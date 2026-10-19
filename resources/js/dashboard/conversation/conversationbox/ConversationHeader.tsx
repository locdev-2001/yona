import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import BackButton from 'dashboard/components/widgets/BackButton';
import { useIsLargeScreen } from 'dashboard/composables/useViewportWidth';
import { useConversation } from '../ConversationContext';
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

    if (!selectedConversation) return null;

    const currentContact = selectedConversation.meta.sender;
    const avatar = (
        <Avatar
            name={currentContact.name ?? ''}
            seed={avatarSeed('user', currentContact.id)}
            src={currentContact.thumbnail}
            size={36}
            previewable
        />
    );

    if (!isWideLayout) {
        return (
            <div
                data-testid="conversation-header"
                className={`flex flex-row items-center justify-between gap-2 flex-none w-full min-w-0 px-2 h-12 max-md:h-14 border-b border-n-weak bg-n-surface-panel ${className}`}
            >
                <div className="flex items-center justify-start min-w-0 flex-1 gap-2">
                    {showBackButton ? <BackButton backUrl={CHAT_LIST_PATH} isIconOnlyBelowMd /> : null}
                    {avatar}
                    <span className="text-sm font-medium truncate leading-tight text-n-slate-12">{currentContact.name}</span>
                </div>
                <div className="flex flex-row items-center justify-end flex-shrink-0 gap-1 header-actions-wrap">
                    <ChatActionsMenu triggerClassName="max-md:!size-11" />
                </div>
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
                {avatar}
                <div className="flex flex-col items-start min-w-0 ms-2 overflow-hidden">
                    <span className="text-sm font-medium truncate leading-tight text-n-slate-12">{currentContact.name}</span>
                    {currentContact.username ? <span className="text-xs truncate text-n-slate-11">@{currentContact.username}</span> : null}
                </div>
            </div>
            <div className="flex flex-row items-center justify-end flex-shrink-0 gap-2 header-actions-wrap">
                <ChatActionsMenu />
            </div>
        </div>
    );
}
