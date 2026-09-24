import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import type { MessageSender } from 'dashboard/conversation/types';
import type { MessageOrientation, MessageVariant } from './constants';
import type { MessageAttachment } from './helpers/attachments';
import type { ReplyQuote } from './helpers/replyQuote';

// Port từ dashboard/components-next/message/provider.js — provide/inject của Vue
// thay bằng React context; Message.tsx là provider, bubble/meta là consumer.

export interface MessageContextValue {
    id: number;
    content: string | null;
    createdAt: number;
    messageType: number;
    status: string | null;
    isPrivate: boolean;
    sourceId: string | null;
    sender: MessageSender | null;
    senderType: string | null;
    contentAttributes: Record<string, unknown>;
    attachments: MessageAttachment[];
    // filteredCurrentChatAttachments gốc đọc getter store; ở đây MessageList
    // truyền xuống (đã lọc còn ảnh/video/ig_reel/âm thanh) để mở gallery.
    filteredCurrentChatAttachments: MessageAttachment[];
    // Khối trích dẫn đã tính sẵn (tin gốc hoặc ảnh chụp của nền tảng); null = không vẽ.
    replyQuote: ReplyQuote | null;
    variant: MessageVariant;
    orientation: MessageOrientation;
    shouldGroupWithNext: boolean;
    channelType: string | null;
    // Năng lực của inbox đang mở (docs/channel-capabilities.md §3): bong bóng và
    // meta gate theo cái này, KHÔNG theo channelType.
    inboxCapabilities: readonly string[];
    // Thả/gỡ biểu cảm — bấm lại chính emoji mình đã thả là gỡ. Không có hàm này
    // (kênh không khai `outbound_reaction`) thì hàng emoji chỉ để đọc.
    onToggleReaction?: (emoji: string) => void;
    // Thu hồi (kênh khai `outbound_recall`) hoặc xoá một chiều ở Yona — lõi tự
    // quyết theo năng lực, FE chỉ đổi nhãn.
    onDeleteMessage?: () => void;
    // Trả lời trích dẫn chính tin này. Mỗi hành động trên thanh là một callback
    // tuỳ chọn như vậy; cờ hiện nút nằm ở helpers/messageActions.ts.
    onReplyTo?: () => void;
}

const MessageControl = createContext<MessageContextValue | null>(null);

export function useMessageContext(): MessageContextValue {
    const context = useContext(MessageControl);
    if (context === null) {
        throw new Error('Component is missing a parent <Message /> component.');
    }
    return context;
}

export function MessageProvider({ value, children }: { value: MessageContextValue; children: ReactNode }) {
    return <MessageControl.Provider value={value}>{children}</MessageControl.Provider>;
}
