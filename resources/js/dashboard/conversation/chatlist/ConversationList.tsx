import { useEffect, useRef } from 'react';

import { t } from '../../../i18n';
import Loader from 'shared/components/loader/Loader';
import { chatUrl, useConversation } from '../ConversationContext';
import type { Conversation } from '../types';
import ConversationItem from './ConversationItem';

// Thẻ không có đường kẻ: tách nhau bằng khoảng cách, hover và đang chọn là nền bo góc.
// Cuộn gần cuối thì nạp trang kế (IntersectionObserver).
interface ConversationListProps {
    conversationList: Conversation[];
    isLoading?: boolean;
    showEndOfListMessage?: boolean;
    onLoadMore: () => void;
}

export default function ConversationList({
    conversationList,
    isLoading = false,
    showEndOfListMessage = false,
    onLoadMore,
}: ConversationListProps) {
    const { conversationId, searchQuery } = useConversation();

    const conversationListRef = useRef<HTMLDivElement>(null);
    const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
    const onLoadMoreRef = useRef(onLoadMore);
    onLoadMoreRef.current = onLoadMore;

    const showLoadMoreSentinel = !isLoading && !showEndOfListMessage;

    useEffect(() => {
        const sentinel = loadMoreSentinelRef.current;
        if (!showLoadMoreSentinel || !sentinel) return undefined;

        const observer = new IntersectionObserver(
            entries => {
                if (entries.some(entry => entry.isIntersecting)) {
                    onLoadMoreRef.current();
                }
            },
            { root: conversationListRef.current, rootMargin: '100px 0px 100px 0px' },
        );
        observer.observe(sentinel);

        return () => observer.disconnect();
    }, [showLoadMoreSentinel]);

    return (
        <div ref={conversationListRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] conversations-list">
            <div className="flex flex-col gap-0.5 px-2">
                {conversationList.map(chat => (
                    <ConversationItem
                        key={chat.id}
                        source={chat}
                        conversationPath={chatUrl(chat.id)}
                        isActiveChat={conversationId === chat.id}
                        searchQuery={searchQuery}
                    />
                ))}
            </div>
            {isLoading ? (
                <div className="flex justify-center my-4">
                    <Loader className="text-n-brand" />
                </div>
            ) : showEndOfListMessage ? (
                <p className="p-4 text-center text-n-slate-11">{t('CHAT_LIST.EOF')}</p>
            ) : (
                <div ref={loadMoreSentinelRef} />
            )}
        </div>
    );
}
