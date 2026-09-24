import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { readInReplyToId } from 'dashboard/components-next/message/helpers/replyQuote';

import { fetchMessages } from '../api';
import { getReplyTarget, removeReplyTarget, setReplyTarget } from '../replyToStore';
import type { ConversationMessage } from '../types';

// Trạng thái "đang trả lời tin nào" của khung soạn + tra các tin gốc nằm ngoài
// trang đang tải (bong bóng trích dẫn tin cũ, hoặc tin đang trả lời đã lưu từ
// trước khi reload). Mỗi tin gốc tra đúng một lần bằng khoảng [id, id + 1) của
// API danh sách tin nhắn, không cần endpoint riêng.

interface UseMessageReplyArgs {
    accountId: number;
    conversationId: number;
    messages: ConversationMessage[];
    // Kênh khai `outbound_reply_to`. Không khai thì không bao giờ có tin đang trả lời.
    enabled: boolean;
}

interface UseMessageReplyResult {
    replyTarget: ConversationMessage | null;
    startReply: (message: ConversationMessage) => void;
    clearReply: () => void;
    replyTargets: ReadonlyMap<number, ConversationMessage | null>;
}

interface StoredReplyTarget {
    conversationId: number;
    messageId: number | null;
}

interface ReplyTargetLookup {
    conversationId: number;
    targets: ReadonlyMap<number, ConversationMessage | null>;
}

interface PendingLookups {
    conversationId: number;
    loading: Set<number>;
    // Lỗi mạng: không tra lại trong phiên này, cũng không xoá tin đang trả lời.
    failed: Set<number>;
}

const EMPTY_TARGETS: ReadonlyMap<number, ConversationMessage | null> = new Map();

async function fetchSingleMessage(
    accountId: number,
    conversationId: number,
    messageId: number,
): Promise<ConversationMessage | null> {
    const response = await fetchMessages(accountId, conversationId, messageId + 1, messageId);

    return response.payload.find(message => message.id === messageId) ?? null;
}

export function useMessageReply({
    accountId,
    conversationId,
    messages,
    enabled,
}: UseMessageReplyArgs): UseMessageReplyResult {
    const [storedTarget, setStoredTarget] = useState<StoredReplyTarget>(() => ({
        conversationId,
        messageId: getReplyTarget(conversationId),
    }));
    const [lookup, setLookup] = useState<ReplyTargetLookup>({ conversationId, targets: EMPTY_TARGETS });
    const pendingRef = useRef<PendingLookups>({ conversationId, loading: new Set(), failed: new Set() });
    const conversationIdRef = useRef(conversationId);
    conversationIdRef.current = conversationId;

    // Đổi hội thoại: đọc lại tin đang trả lời của hội thoại mới ngay trong lượt
    // render này để khối "Đang trả lời" của hội thoại cũ không nháy sang.
    if (storedTarget.conversationId !== conversationId) {
        setStoredTarget({ conversationId, messageId: getReplyTarget(conversationId) });
    }
    if (lookup.conversationId !== conversationId) {
        setLookup({ conversationId, targets: EMPTY_TARGETS });
    }

    const storedTargetId =
        storedTarget.conversationId === conversationId ? storedTarget.messageId : getReplyTarget(conversationId);
    const targets = lookup.conversationId === conversationId ? lookup.targets : EMPTY_TARGETS;

    useEffect(() => {
        if (!conversationId) return;

        if (pendingRef.current.conversationId !== conversationId) {
            pendingRef.current = { conversationId, loading: new Set(), failed: new Set() };
        }
        const pending = pendingRef.current;

        const listedIds = new Set(messages.map(message => message.id));
        const wantedIds = new Set<number>();
        messages.forEach(message => {
            const repliedId = readInReplyToId(message.content_attributes ?? {});
            if (repliedId !== null && !listedIds.has(repliedId)) wantedIds.add(repliedId);
        });
        if (enabled && storedTargetId !== null && !listedIds.has(storedTargetId)) wantedIds.add(storedTargetId);

        wantedIds.forEach(messageId => {
            if (targets.has(messageId) || pending.loading.has(messageId) || pending.failed.has(messageId)) return;

            pending.loading.add(messageId);
            fetchSingleMessage(accountId, conversationId, messageId).then(
                found => {
                    pending.loading.delete(messageId);
                    if (conversationIdRef.current !== conversationId) return;

                    setLookup(current =>
                        current.conversationId === conversationId
                            ? { conversationId, targets: new Map(current.targets).set(messageId, found) }
                            : current,
                    );
                    if (found === null && getReplyTarget(conversationId) === messageId) {
                        removeReplyTarget(conversationId);
                        setStoredTarget(current =>
                            current.conversationId === conversationId && current.messageId === messageId
                                ? { conversationId, messageId: null }
                                : current,
                        );
                    }
                },
                () => {
                    pending.loading.delete(messageId);
                    pending.failed.add(messageId);
                },
            );
        });
    }, [accountId, conversationId, messages, enabled, storedTargetId, targets]);

    const startReply = useCallback(
        (message: ConversationMessage) => {
            if (!conversationId || message.id <= 0) return;
            setReplyTarget(conversationId, message.id);
            setStoredTarget({ conversationId, messageId: message.id });
        },
        [conversationId],
    );

    const clearReply = useCallback(() => {
        if (!conversationId) return;
        removeReplyTarget(conversationId);
        setStoredTarget({ conversationId, messageId: null });
    }, [conversationId]);

    const replyTarget = useMemo(() => {
        if (!enabled || storedTargetId === null) return null;

        return messages.find(message => message.id === storedTargetId) ?? targets.get(storedTargetId) ?? null;
    }, [enabled, storedTargetId, messages, targets]);

    return { replyTarget, startReply, clearReply, replyTargets: targets };
}
