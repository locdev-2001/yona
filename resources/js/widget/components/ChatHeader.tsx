import DOMPurify from 'dompurify';

import { replyTimeLabel, useInboxAvailability } from './Availability';
import HeaderActions from './HeaderActions';
import { HEADER_ACTION_CLASS } from './headerActionClass';
import WidgetAvatar from './WidgetAvatar';
import { t } from '../i18n';
import { useWidgetState } from '../store/hooks';
import type { AvailableAgent } from '../types';

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
    const agentsOnDuty = assignee ? availableAgents.filter(agent => agent.id === assignee.id) : availableAgents;
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
                    <WidgetAvatar name={assignee.name} src={assignee.avatar_url} size={34} tone="agent" />
                ) : (
                    <WidgetAvatar name={inboxName} src={avatarUrl} size={34} tone="inbox" />
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
            <HeaderActions showPopoutButton={showPopoutButton} />
        </header>
    );
}
