import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { MutableRefObject, RefObject } from 'react';

import type { ConversationMessage } from '../types';

/** Cách đáy quá chừng này thì coi là đang đọc tin cũ: hiện nút, tin mới không kéo khung xuống. */
export const LATEST_MESSAGE_DISTANCE_PX = 200;

export function distanceFromLatest(panel: HTMLElement): number {
    return panel.scrollHeight - panel.scrollTop - panel.clientHeight;
}

/** Số tin nối thêm vào cuối kể từ tin cuối lần trước (không thấy tin cũ = đổi cả danh sách, tính một). */
export function countAppendedMessages(messages: ConversationMessage[], previousLastId: number | null): number {
    if (previousLastId === null) return 0;
    const previousIndex = messages.findIndex(message => message.id === previousLastId);

    return previousIndex === -1 ? 1 : messages.length - 1 - previousIndex;
}

function isOwnMessage(message: ConversationMessage, currentUserId: number | null): boolean {
    return currentUserId !== null && message.sender?.type === 'user' && message.sender.id === currentUserId;
}

interface UseScrollToLatestArgs {
    panelRef: RefObject<HTMLElement | null>;
    messages: ConversationMessage[];
    conversationId: number;
    // Ref "đã cuộn lần đầu" của khung chat: chưa cuộn lần đầu thì chưa xử lý tin mới.
    scrolledConversationRef: MutableRefObject<number | null>;
    currentUserId: number | null;
}

/**
 * Tin mới nối vào cuối chỉ kéo khung xuống đáy khi đang ở gần đáy hoặc tin do
 * chính mình gửi; đang đọc tin cũ thì giữ nguyên chỗ và đếm số tin mới cho nút
 * "Xuống tin mới nhất".
 */
export function useScrollToLatest({
    panelRef,
    messages,
    conversationId,
    scrolledConversationRef,
    currentUserId,
}: UseScrollToLatestArgs) {
    const [isAwayFromLatest, setIsAwayFromLatest] = useState(false);
    const [unseenCount, setUnseenCount] = useState(0);
    const isAwayFromLatestRef = useRef(false);
    const lastSeenTailRef = useRef<{ conversationId: number; messageId: number | null }>({
        conversationId,
        messageId: null,
    });

    const setAway = useCallback((away: boolean) => {
        isAwayFromLatestRef.current = away;
        setIsAwayFromLatest(away);
        if (!away) setUnseenCount(0);
    }, []);

    const lastMessage = messages.length ? messages[messages.length - 1] : null;
    useLayoutEffect(() => {
        const previousTail = lastSeenTailRef.current;
        lastSeenTailRef.current = { conversationId, messageId: lastMessage?.id ?? null };

        if (previousTail.conversationId !== conversationId) {
            setAway(false);
            return;
        }

        const panel = panelRef.current;
        if (!panel || !lastMessage || scrolledConversationRef.current !== conversationId) return;
        if (lastMessage.id === previousTail.messageId) return;

        if (!isAwayFromLatestRef.current || isOwnMessage(lastMessage, currentUserId)) {
            panel.scrollTop = panel.scrollHeight;
            setAway(false);
            return;
        }
        setUnseenCount(count => count + countAppendedMessages(messages, previousTail.messageId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastMessage?.id, conversationId]);

    // Khung tin co lại (ô soạn bung ra, banner xuất hiện) mà đang ở đáy thì giữ đáy,
    // không để tin cuối bị ô soạn che mất.
    useLayoutEffect(() => {
        const panel = panelRef.current;
        if (!panel) return undefined;

        const observer = new ResizeObserver(() => {
            if (!isAwayFromLatestRef.current) panel.scrollTop = panel.scrollHeight;
        });
        observer.observe(panel);
        return () => observer.disconnect();
    }, [panelRef]);

    const onScroll = useCallback(
        (panel: HTMLElement) => {
            const away = distanceFromLatest(panel) > LATEST_MESSAGE_DISTANCE_PX;
            if (away !== isAwayFromLatestRef.current) setAway(away);
        },
        [setAway],
    );

    const jump = useCallback(() => {
        const panel = panelRef.current;
        if (!panel) return;
        panel.scrollTo({ top: panel.scrollHeight, behavior: 'smooth' });
    }, [panelRef]);

    return { isAwayFromLatest, unseenCount, onScroll, jump };
}
