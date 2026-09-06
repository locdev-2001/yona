import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import type { ConversationMessage } from 'dashboard/conversation/types';
import Message from './Message';

// MessageMeta gate dấu tick theo NĂNG LỰC kênh (event_delivered / event_seen),
// không theo channel_type — docs/channel-capabilities.md §3.

const outgoing = (status: string): ConversationMessage =>
    ({
        id: 1,
        content: 'Chào bạn',
        message_type: 1,
        content_type: 'text',
        content_attributes: {},
        created_at: 1719500000,
        private: false,
        status,
        sender: null,
        attachments: [],
    }) as unknown as ConversationMessage;

const iconOf = (status: string, capabilities: readonly string[]) => {
    const { container } = render(
        <Message message={outgoing(status)} channelType="Channel::Zalo" inboxCapabilities={capabilities} />,
    );

    // MessageStatus là span duy nhất mang class icon lucide (avatar cũng có title).
    return (
        Array.from(container.querySelectorAll('span[title]'))
            .map(node => node.className)
            .find(className => className.includes('i-lucide-')) ?? ''
    );
};

describe('MessageMeta', () => {
    it('kênh khai event_seen: tin đã xem hiện hai tick xanh', () => {
        expect(iconOf('read', ['event_delivered', 'event_seen'])).toContain('i-lucide-check-check');
    });

    it('kênh khai event_delivered: tin đã giao hiện hai tick xám', () => {
        expect(iconOf('delivered', ['event_delivered', 'event_seen'])).toContain('i-lucide-check-check');
    });

    it('kênh có biên nhận: tin mới gửi hiện một tick', () => {
        expect(iconOf('sent', ['event_delivered', 'event_seen'])).toContain('i-lucide-check');
    });

    it('kênh KHÔNG khai biên nhận: luôn là đồng hồ xoay dù status là gì', () => {
        expect(iconOf('read', [])).toContain('i-lucide-clock');
        expect(iconOf('sent', [])).toContain('i-lucide-clock');
    });

    it('kênh chỉ khai event_delivered: trạng thái read vẫn không lên tick xanh', () => {
        expect(iconOf('read', ['event_delivered'])).toContain('i-lucide-check');
        expect(iconOf('read', ['event_delivered'])).not.toContain('i-lucide-check-check');
    });
});
