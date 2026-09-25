import MessageFormatter from 'shared/helpers/MessageFormatter';

import type { LinkMessage } from '../../api';

export const SHARED_CONTENT_TABS = ['media', 'files', 'links'] as const;

export type SharedContentTab = (typeof SHARED_CONTENT_TABS)[number];

export interface SharedLink {
    key: string;
    messageId: number;
    url: string;
    domain: string;
    createdAt: number;
}

function domainOf(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

// Mỗi liên kết trong tin một dòng, giữ thứ tự tin (mới trước) rồi thứ tự trong tin.
export function linksOfMessages(messages: LinkMessage[]): SharedLink[] {
    return messages.flatMap(message =>
        new MessageFormatter(message.content).links.map((link, position) => ({
            key: `${message.message_id}-${position}`,
            messageId: message.message_id,
            url: link.url,
            domain: domainOf(link.url),
            createdAt: message.created_at,
        })),
    );
}
