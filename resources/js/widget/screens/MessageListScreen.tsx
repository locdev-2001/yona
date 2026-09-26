import { useEffect } from 'react';

import WidgetAvatar from '../components/WidgetAvatar';
import { MESSAGE_TYPE } from '../helpers/constants';
import { relativeTime } from '../helpers/relativeTime';
import { t } from '../i18n';
import { conversationList, useConversationList } from '../store/conversationList';
import { useWidgetState } from '../store/hooks';
import EmptyState from '../ui/EmptyState';
import PanelHeader from '../ui/PanelHeader';
import { openConversationScreen, startNewConversation } from './navigation';

/** Tab Tin nhắn: hội thoại của khách, mới nhất trước, chấm chưa đọc, nút nhắn mới nổi ở đáy. */
export default function MessageListScreen() {
    const { items, loaded, loading, hasMore, failed } = useConversationList();
    const channelConfig = useWidgetState(state => state.channelConfig);
    const shopName = channelConfig?.websiteName ?? '';

    // Danh sách cần phiên khách: đợi /config xong (channelConfig có) mới tải.
    const hasSession = Boolean(channelConfig);
    useEffect(() => {
        if (hasSession) void conversationList.load();
    }, [hasSession]);

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-[var(--yona-chat-panel)]">
            <PanelHeader title={t('MESSAGE_LIST.TITLE')} />
            <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain no-scrollbar">
                {loaded && !items.length && !failed ? (
                    <EmptyState icon="i-lucide-message-circle" title={t('MESSAGE_LIST.EMPTY_TITLE')} body={t('MESSAGE_LIST.EMPTY_BODY', { name: shopName })} />
                ) : null}

                {failed ? (
                    <div className="flex flex-col items-center gap-2 p-6 text-center text-[14px] text-[var(--yona-chat-ink-soft)]">
                        {t('MESSAGE_LIST.LOAD_FAILED')}
                        <button type="button" className="font-medium text-[var(--yona-chat-accent-ink)]" onClick={() => void conversationList.load()}>
                            {t('MESSAGE_LIST.RETRY')}
                        </button>
                    </div>
                ) : null}

                <ul className="m-0 list-none p-0 pb-24">
                    {items.map(item => {
                        const unread = item.unread_count > 0;
                        const fromContact = item.last_message?.message_type === MESSAGE_TYPE.INCOMING;
                        const preview = item.last_message?.preview ?? '';
                        const name = item.assignee?.name || shopName;

                        return (
                            <li key={item.id} className="border-b border-[var(--yona-chat-line)]">
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-3 px-5 py-[14px] text-start hover:bg-[var(--yona-chat-hover)]"
                                    onClick={() => openConversationScreen(item.id)}
                                    aria-label={unread ? `${name}, ${t('MESSAGE_LIST.UNREAD', { count: item.unread_count })}` : undefined}
                                >
                                    <WidgetAvatar src={item.assignee?.avatar_url ?? channelConfig?.avatarUrl} size={40} name={name} tone="agent" />
                                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                        <span className="flex items-baseline justify-between gap-2">
                                            <span className="truncate text-[14px] font-medium text-[var(--yona-chat-ink)]">{name}</span>
                                            <span className="flex-none text-[12px] text-[var(--yona-chat-ink-muted)]">{relativeTime(item.last_activity_at)}</span>
                                        </span>
                                        <span className="flex items-center gap-2">
                                            <span
                                                className={`min-w-0 flex-1 truncate text-[13px] ${
                                                    unread ? 'font-medium text-[var(--yona-chat-ink)]' : 'text-[var(--yona-chat-ink-soft)]'
                                                }`}
                                            >
                                                {fromContact ? t('MESSAGE_LIST.YOU', { text: preview }) : preview}
                                            </span>
                                            {unread ? <span className="size-2 flex-none rounded-full bg-[var(--yona-chat-accent)]" /> : null}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>

                {hasMore ? (
                    <button
                        type="button"
                        className="mx-auto mb-24 text-[14px] font-medium text-[var(--yona-chat-accent-ink)]"
                        disabled={loading}
                        onClick={() => void conversationList.load({ more: true })}
                    >
                        {t('MESSAGE_LIST.LOAD_MORE')}
                    </button>
                ) : null}
            </div>
            <div className="pointer-events-none relative -mt-[76px] flex h-[76px] flex-none items-center justify-center">
                <button
                    type="button"
                    className="pointer-events-auto flex h-11 items-center gap-2 rounded-full bg-[var(--yona-chat-accent)] px-5 text-[14px] font-medium text-[var(--yona-chat-on-accent)] shadow-[var(--yona-chat-shadow-card)] active:scale-[0.97]"
                    onClick={startNewConversation}
                >
                    <span className="i-lucide-send size-4" />
                    {t('MESSAGE_LIST.NEW')}
                </button>
            </div>
        </div>
    );
}
