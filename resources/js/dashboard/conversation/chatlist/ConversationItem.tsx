import { memo } from 'react';
import type { MouseEvent } from 'react';
import { router } from '@inertiajs/react';

import ConversationCard from '../../components/widgets/conversation/ConversationCard';
import type { Conversation } from '../types';

// Thẻ không đọc context: mọi dữ liệu đến qua props để `memo` chỉ vẽ lại thẻ có
// hội thoại thật sự đổi khi danh sách nhận cập nhật realtime.
interface ConversationItemProps {
    source: Conversation;
    conversationPath: string;
    isActiveChat?: boolean;
    searchQuery?: string;
}

function ConversationItem({ source, conversationPath, isActiveChat = false, searchQuery = '' }: ConversationItemProps) {
    const onCardClick = (event: MouseEvent<HTMLDivElement>) => {
        if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            window.open(conversationPath, '_blank', 'noopener,noreferrer');
            return;
        }
        if (isActiveChat) return;
        router.visit(conversationPath, { preserveState: true, preserveScroll: true });
    };

    return (
        <ConversationCard
            chat={source}
            currentContact={source.meta.sender}
            isActiveChat={isActiveChat}
            highlightQuery={searchQuery}
            onClick={onCardClick}
        />
    );
}

export default memo(ConversationItem);
