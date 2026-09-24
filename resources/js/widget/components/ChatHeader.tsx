import DOMPurify from 'dompurify';

import { useInboxAvailability } from './Availability';
import HeaderActions from './HeaderActions';
import { t } from '../i18n';
import type { AvailableAgent } from '../types';

interface ChatHeaderProps {
    title: string;
    avatarUrl?: string;
    showPopoutButton?: boolean;
    showBackButton?: boolean;
    availableAgents: AvailableAgent[];
    onBack: () => void;
}

// Header một màn chat: avatar 34px có chấm trạng thái, tên + trạng thái thật, hành động bên phải.
export function ChatHeader({
    title,
    avatarUrl = '',
    showPopoutButton = false,
    showBackButton = false,
    availableAgents,
    onBack,
}: ChatHeaderProps) {
    const { isOnline } = useInboxAvailability(availableAgents);
    const plainTitle = DOMPurify.sanitize(title, { ALLOWED_TAGS: [] });

    return (
        <header className="flex items-center w-full gap-2 py-2 ps-3 pe-2 bg-[var(--yona-chat-panel)] border-b border-[var(--yona-chat-line)]">
            {showBackButton ? (
                <button
                    type="button"
                    aria-label={t('HEADER.BACK')}
                    className="flex items-center justify-center flex-shrink-0 rounded-full size-11 -ms-2 text-[var(--yona-chat-ink)] hover:bg-[var(--yona-chat-field)]"
                    onClick={onBack}
                >
                    <span className="i-lucide-chevron-left size-6 rtl:rotate-180" />
                </button>
            ) : null}
            <div className="relative flex-shrink-0 size-[34px]">
                {avatarUrl ? (
                    <img className="object-cover rounded-full size-[34px]" src={avatarUrl} alt="" />
                ) : (
                    <span className="flex items-center justify-center rounded-full size-[34px] bg-[var(--yona-chat-accent)] text-[var(--yona-chat-on-accent)] text-sm font-medium">
                        {plainTitle.trim().charAt(0).toUpperCase()}
                    </span>
                )}
                <span
                    aria-hidden="true"
                    data-testid="header-status-dot"
                    className={`absolute bottom-0 end-0 size-2.5 rounded-full ring-2 ring-[var(--yona-chat-panel)] ${
                        isOnline ? 'bg-[var(--yona-chat-online-dot)]' : 'bg-[var(--yona-chat-dot)]'
                    }`}
                />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[15px] font-medium leading-5 truncate text-[var(--yona-chat-ink)]">{plainTitle}</span>
                <span
                    className={`text-xs leading-4 ${
                        isOnline ? 'text-[var(--yona-chat-online)]' : 'text-[var(--yona-chat-ink-muted)]'
                    }`}
                >
                    {isOnline ? t('HEADER.ONLINE') : t('HEADER.AWAY')}
                </span>
            </div>
            <HeaderActions showPopoutButton={showPopoutButton} />
        </header>
    );
}
