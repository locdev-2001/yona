import DOMPurify from 'dompurify';

import { replyTimeLabel, useInboxAvailability } from './Availability';
import HeaderActions from './HeaderActions';
import { ExpandButton } from '../ui/PanelHeader';
import { HEADER_ACTION_CLASS } from './headerActionClass';
import WidgetAvatar from './WidgetAvatar';
import { t } from '../i18n';
import { useWidgetState } from '../store/hooks';
import type { AvailableAgent } from '../types';
import { avatarSeed } from 'shared/avatar/avatarSeed';

interface ChatHeaderProps {
    title: string;
    avatarUrl?: string;
    showPopoutButton?: boolean;
    showBackButton?: boolean;
    availableAgents: AvailableAgent[];
    onBack: () => void;
}

// Header một màn chat: hộp thư, hoặc nhân viên khi hội thoại đã có người nhận.
export function ChatHeader({
    title,
    avatarUrl = '',
    showPopoutButton = false,
    showBackButton = false,
    availableAgents,
    onBack,
}: ChatHeaderProps) {
    const assignee = useWidgetState(state => state.conversationAttributes.assignee ?? null);
    // Cùng một luật trực tuyến (trong giờ làm việc + có người trực) cho hộp thư lẫn nhân viên phụ trách,
    // để header không báo "đang hoạt động" khi màn ngoài giờ đang nói hẹn trả lời sau.
    // Trạng thái trực của nhân viên phụ trách đi kèm hội thoại (không tra danh sách thành
    // viên hộp thư, vì người được gán có thể không nằm trong đó).
    const agentsOnDuty = assignee
        ? assignee.availability_status === 'online'
            ? [{ id: assignee.id, name: assignee.name, avatar_url: assignee.avatar_url }]
            : []
        : availableAgents;
    const { isOnline, inboxConfig } = useInboxAvailability(agentsOnDuty);
    const availableMessage = useWidgetState(state => state.appConfig.availableMessage);
    const unavailableMessage = useWidgetState(state => state.appConfig.unavailableMessage);

    const inboxName = DOMPurify.sanitize(title, { ALLOWED_TAGS: [] });
    const onlineText = assignee ? t('HEADER.AGENT_ACTIVE') : availableMessage || replyTimeLabel(inboxConfig.replyTime);
    const awayText = assignee ? t('HEADER.AWAY') : unavailableMessage || t('HEADER.AWAY');

    return (
        <header className="flex items-center w-full gap-[11px] px-4 py-[13px] bg-[var(--yona-chat-panel)] border-b border-[var(--yona-chat-line)]">
            {showBackButton ? (
                <button type="button" aria-label={t('HEADER.BACK')} className={`${HEADER_ACTION_CLASS} -ms-2`} onClick={onBack}>
                    <span className="i-lucide-chevron-left size-5 rtl:rotate-180" />
                </button>
            ) : null}
            <div className="relative flex-shrink-0" data-testid="header-avatar">
                {assignee ? (
                    <WidgetAvatar name={assignee.name} seed={avatarSeed('user', assignee.id)} src={assignee.avatar_url} size={34} />
                ) : (
                    <WidgetAvatar name={inboxName} src={avatarUrl} size={34} />
                )}
                <span
                    aria-hidden="true"
                    data-testid="header-status-dot"
                    className={`absolute -bottom-px -end-px size-2.5 rounded-full ring-2 ring-[var(--yona-chat-panel)] ${
                        isOnline ? 'bg-[var(--yona-chat-online-dot)]' : 'bg-[var(--yona-chat-dot)]'
                    }`}
                />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
                <span
                    data-testid="header-title"
                    className="text-sm font-semibold leading-[1.2] truncate text-[var(--yona-chat-ink)]"
                >
                    {assignee ? assignee.name : inboxName}
                </span>
                <span
                    data-testid="header-status"
                    className={`text-[11.5px] leading-[1.4] truncate ${
                        isOnline ? 'text-[var(--yona-chat-online)]' : 'text-[var(--yona-chat-ink-muted)]'
                    }`}
                >
                    {isOnline ? onlineText : awayText}
                </span>
            </div>
            <ExpandButton />
            <HeaderActions showPopoutButton={showPopoutButton} />
        </header>
    );
}
