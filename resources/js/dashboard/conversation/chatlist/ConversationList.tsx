import { useEffect, useRef } from 'react';

import { t } from '../../../i18n';
import Loader from 'shared/components/loader/Loader';
import type { Conversation } from '../types';
import ConversationItem from './ConversationItem';

// Port từ dashboard/components/ConversationList.vue — bỏ Virtualizer (virtua):
// render list thường; selector [&>div:has(+_div_.active)>*] của Virtualizer
// (xóa border-top của card đứng trước card active/selected) tái hiện trên
// wrapper phẳng vì card giờ là con trực tiếp. IntersectionObserver dùng API
// trực tiếp thay component; phím tắt j/k cắt (B3).
interface ConversationListProps {
    conversationList: Conversation[];
    isLoading?: boolean;
    showEndOfListMessage?: boolean;
    showAssignee?: boolean;
    conversationType?: string;
    onLoadMore: () => void;
}

export default function ConversationList({
    conversationList,
    isLoading = false,
    showEndOfListMessage = false,
    showAssignee = false,
    conversationType = '',
    onLoadMore,
}: ConversationListProps) {
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
        <div ref={conversationListRef} className="flex-1 min-h-0 overflow-y-auto conversations-list">
            <div className="[&>div:has(+div.active)]:!border-n-surface-1 [&>div:has(+div.selected)]:!border-n-surface-1">
                {conversationList.map(chat => (
                    <ConversationItem
                        key={chat.id}
                        source={chat}
                        showAssignee={showAssignee}
                        conversationType={conversationType}
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
