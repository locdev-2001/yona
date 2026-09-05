import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import type { ConversationMessage, MessageSender } from 'dashboard/conversation/types';
import type { MessageOrientation, MessageVariant } from './constants';
import type { MessageAttachment } from './helpers/attachments';

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
    inReplyTo: ConversationMessage | null;
    variant: MessageVariant;
    orientation: MessageOrientation;
    shouldGroupWithNext: boolean;
    channelType: string | null;
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
