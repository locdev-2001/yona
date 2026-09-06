import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Message from './Message';
import type { ConversationMessage } from 'dashboard/conversation/types';
import { groupReactions, readReactions } from './helpers/reactions';

const BASE_TIME = 1756707112;

function outgoing(overrides: Partial<ConversationMessage> = {}): ConversationMessage {
    return {
        id: 11,
        content: 'Đã nhận đơn ạ',
        inbox_id: 58,
        conversation_id: 2,
        message_type: 1,
        content_type: 'text',
        status: 'sent',
        content_attributes: {},
        created_at: BASE_TIME,
        private: false,
        source_id: 'zalo-1',
        sender: { id: 3, name: 'Lộc', type: 'user', thumbnail: '' },
        sender_id: 3,
        sender_type: 'User',
        ...overrides,
    };
}

const renderMessage = (
    payload: ConversationMessage,
    capabilities: string[],
    handlers: {
        onToggleReaction?: () => void;
        onDeleteMessage?: () => void;
    } = {},
) =>
    render(
        <Message
            message={payload}
            channelType="Channel::Zalo"
            inboxCapabilities={capabilities}
            onToggleReaction={handlers.onToggleReaction}
            onDeleteMessage={handlers.onDeleteMessage}
        />,
    ).container;

describe('thanh hành động trên tin gate theo năng lực kênh', () => {
    const handlers = { onToggleReaction: vi.fn(), onDeleteMessage: vi.fn() };

    it('kênh chưa khai năng lực thì không có nút cảm xúc, chỉ còn "Xoá" một chiều như bản gốc', () => {
        renderMessage(outgoing(), [], handlers);

        expect(screen.queryByRole('button', { name: 'React' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Delete' })).not.toBeNull();
    });

    it('hiện nút thả cảm xúc khi kênh khai outbound_reaction', () => {
        renderMessage(outgoing(), ['outbound_reaction'], handlers);

        expect(screen.getByRole('button', { name: 'React' })).not.toBeNull();
    });

    it('nhãn "thu hồi" chỉ khi kênh khai outbound_recall, ngược lại là "xoá"', () => {
        const withRecall = renderMessage(outgoing(), ['outbound_recall'], handlers);
        expect(withRecall.querySelector('[aria-label="Unsend for everyone"]')).not.toBeNull();

        const withoutRecall = renderMessage(outgoing(), ['outbound_reaction'], handlers);
        expect(withoutRecall.querySelector('[aria-label="Delete"]')).not.toBeNull();
    });

    it('bấm emoji trong bộ chọn nhanh gọi handler', () => {
        const onToggleReaction = vi.fn();
        renderMessage(outgoing(), ['outbound_reaction'], { onToggleReaction });

        fireEvent.click(screen.getByRole('button', { name: 'React' }));
        fireEvent.click(screen.getByRole('button', { name: '👍' }));

        expect(onToggleReaction).toHaveBeenCalledTimes(1);
    });

    it('tin đã thu hồi thì không cho thả cảm xúc nữa', () => {
        renderMessage(outgoing({ content_attributes: { deleted: true } }), ['outbound_reaction'], handlers);

        expect(screen.queryByRole('button', { name: 'React' })).toBeNull();
    });
});

describe('hàng biểu cảm dưới bong bóng', () => {
    it('gom theo emoji và đếm, không in [object Object] với hình dạng mới', () => {
        const container = renderMessage(
            outgoing({
                content_attributes: {
                    reactions: [
                        { emoji: '👍', by: 'agent:3', at: BASE_TIME },
                        { emoji: '👍', by: '9876543210', at: BASE_TIME },
                        { emoji: '❤️', by: '9876543210', at: BASE_TIME },
                    ],
                },
            }),
            ['outbound_reaction'],
            { onToggleReaction: vi.fn() },
        );

        const row = container.querySelector('[data-yona-reactions]');
        expect(row?.textContent).toBe('👍2❤️');
        expect(row?.textContent).not.toContain('object');
    });

    it('vẫn đọc được bản ghi cũ dạng mảng emoji phẳng', () => {
        expect(groupReactions(readReactions({ reactions: ['👍', '👍', '❤️'] }))).toEqual([
            { emoji: '👍', count: 2, reactedBySelf: false },
            { emoji: '❤️', count: 1, reactedBySelf: false },
        ]);
    });

    it('đánh dấu emoji do phía tenant thả', () => {
        const [group] = groupReactions(readReactions({ reactions: [{ emoji: '👍', by: 'agent:self' }] }));

        expect(group.reactedBySelf).toBe(true);
    });
});
