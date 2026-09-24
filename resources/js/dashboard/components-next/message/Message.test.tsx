import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Message from './Message';
import type { ConversationMessage } from 'dashboard/conversation/types';

vi.mock('dashboard/components/widgets/conversation/components/GalleryView', () => ({
    default: () => <div data-testid="gallery" />,
}));

// Tin của agent bot (message_type outgoing, sender.type = agent_bot) phải đứng
// bên phải như tin agent và dùng bong bóng variant `bot` — Message.vue gốc.
const BASE_TIME = 1756707112;

function message(overrides: Partial<ConversationMessage> = {}): ConversationMessage {
    return {
        id: 1,
        content: 'Xin chào',
        inbox_id: 1,
        conversation_id: 4,
        message_type: 1,
        content_type: 'text',
        status: 'sent',
        content_attributes: {},
        created_at: BASE_TIME,
        private: false,
        source_id: null,
        ...overrides,
    };
}

const renderMessage = (payload: ConversationMessage) =>
    render(<Message message={payload} channelType="Channel::Api" />).container;

const bubbleWrapper = (container: HTMLElement) => container.querySelector('.message-bubble-container');

describe('Message với sender là agent bot', () => {
    const bot = { id: 7, name: 'Bot Trợ Lý QA', type: 'agent_bot' as const, avatar_url: '/bot.png' };

    it('đặt tin bot outgoing bên phải', () => {
        const container = renderMessage(message({ sender: bot, sender_type: 'AgentBot', sender_id: bot.id }));

        expect(bubbleWrapper(container)?.className).toContain('justify-end');
        expect(bubbleWrapper(container)?.className).not.toContain('justify-start');
    });

    it('dùng bong bóng variant bot chứ không phải agent', () => {
        const container = renderMessage(message({ sender: bot, sender_type: 'AgentBot', sender_id: bot.id }));

        expect(container.querySelector('.bg-n-solid-iris')).not.toBeNull();
        expect(container.querySelector('.bg-n-solid-blue')).toBeNull();
    });

    it('lấy avatar bot từ avatar_url', () => {
        const container = renderMessage(message({ sender: bot, sender_type: 'AgentBot', sender_id: bot.id }));

        expect(container.querySelector('img')?.getAttribute('src')).toBe('/bot.png');
    });

    it('vẫn để tin của agent thật bên phải với bong bóng agent', () => {
        const agent = { id: 2, name: 'John', type: 'user' as const, thumbnail: '/john.png' };
        const container = renderMessage(message({ sender: agent, sender_type: 'User', sender_id: agent.id }));

        expect(bubbleWrapper(container)?.className).toContain('justify-end');
        expect(container.querySelector('.bg-n-solid-blue')).not.toBeNull();
    });

    it('giữ tin của khách bên trái', () => {
        const contact = { id: 3, name: 'Trang', type: 'contact' as const, thumbnail: '' };
        const container = renderMessage(
            message({ message_type: 0, sender: contact, sender_type: 'Contact', sender_id: contact.id }),
        );

        expect(bubbleWrapper(container)?.className).toContain('justify-start');
    });
});

describe('Message với sticker', () => {
    const STICKER_URL = 'https://cdn.zalo.test/98930.webp';
    const stickerMessage = (overrides: Partial<ConversationMessage> = {}) =>
        message({
            message_type: 0,
            content: null,
            content_type: 'sticker',
            attachments: [{ id: 9, file_type: 'image', data_url: STICKER_URL, thumb_url: '' }],
            sender: { id: 3, name: 'Khách A', type: 'contact' as const, thumbnail: '' },
            sender_type: 'Contact',
            sender_id: 3,
            ...overrides,
        });

    it('hiện như sticker: không khung, không nút tải về, bấm không mở thư viện ảnh', () => {
        const container = renderMessage(stickerMessage());
        const bubble = container.querySelector('[data-bubble-name="sticker"]');

        expect(bubble).not.toBeNull();
        expect(bubble?.className).toContain('!bg-transparent');
        expect(bubble?.querySelector('img')?.getAttribute('src')).toBe(STICKER_URL);
        expect(container.querySelector('.i-lucide-download')).toBeNull();

        fireEvent.click(bubble!);
        expect(document.querySelector('[data-testid="gallery"]')).toBeNull();
    });

    it('ảnh thường vẫn mở thư viện ảnh khi bấm (đối chứng)', () => {
        const container = renderMessage(stickerMessage({ content_type: 'text' }));

        fireEvent.click(container.querySelector('[data-bubble-name="image"]')!);

        expect(document.querySelector('[data-testid="gallery"]')).not.toBeNull();
    });

    it('sticker chỉ có markdown trong nội dung (không đính kèm) vẫn đi bong bóng chữ', () => {
        const container = renderMessage(
            stickerMessage({ content: '![sticker-52002734](https://stickershop.line-scdn.net/s.png)', attachments: [] }),
        );

        expect(container.querySelector('[data-bubble-name="sticker"]')).toBeNull();
        expect(container.querySelector('[data-bubble-name="text"]')).not.toBeNull();
    });

    it('biểu cảm vẫn hiện dưới sticker', () => {
        const container = renderMessage(
            stickerMessage({ content_attributes: { reactions: [{ emoji: '❤️', by: 'agent:1', at: BASE_TIME }] } }),
        );

        expect(container.querySelector('[data-bubble-name="sticker"] [data-yona-reactions]')?.textContent).toBe('❤️');
    });
});
