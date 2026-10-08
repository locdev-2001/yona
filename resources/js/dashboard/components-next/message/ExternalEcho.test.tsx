import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { setLocale } from '../../../i18n';

import Avatar from 'dashboard/components-next/avatar/Avatar';

import Message from './Message';
import { SenderIdentityContext } from './SenderIdentityContext';
import type { ConversationSenderIdentity } from './SenderIdentityContext';
import MessagePreview from 'dashboard/components-next/Conversation/ConversationCard/MessagePreview';
import type { ConversationMessage } from 'dashboard/conversation/types';

const BASE_TIME = 1756707112;

// Nhánh `externalEcho` của Message.vue: tin chủ hộp thư gửi thẳng từ ứng dụng
// của kênh rồi kênh dội lại. Không có sender nội bộ nên trước lô 2b nó rơi vào nhánh
// isBot và hiện thành bong bóng "Bot" tím.
function outgoingEcho(contentAttributes: Record<string, unknown> = {}): ConversationMessage {
    return {
        id: 11,
        content: 'Chị gửi báo giá nhé',
        inbox_id: 58,
        conversation_id: 2,
        message_type: 1,
        content_type: 'text',
        status: 'sent',
        content_attributes: { external_echo: true, ...contentAttributes },
        created_at: BASE_TIME,
        private: false,
        source_id: 'msg-zalo-echo-1',
        sender: undefined,
        sender_id: null,
        sender_type: null,
    };
}

const renderMessage = (payload: ConversationMessage) =>
    render(<Message message={payload} channelType="Channel::Zalo" />).container;

describe('tin chủ shop gửi thẳng từ ứng dụng của kênh', () => {
    it('mang bong bóng của agent, không phải bong bóng Bot', () => {
        const container = renderMessage(outgoingEcho());
        const bubble = container.querySelector('.right-bubble');

        expect(bubble?.className).toContain('bg-n-solid-blue');
        expect(bubble?.className).not.toContain('bg-n-solid-iris');
    });

    it('không biết nền tảng của hộp thư thì nhãn trung tính, không nói "điện thoại"', () => {
        const container = renderMessage(outgoingEcho());
        const label = container.querySelector('[data-testid="external-echo-label"]');

        expect(label?.textContent).toBe('sent outside Yona');
        expect(label?.getAttribute('title')).toBe("This message was sent directly from the channel's own app, not through Yona.");
    });

    it('không đề tên Bot ở avatar', () => {
        const container = renderMessage(outgoingEcho());

        expect(container.textContent).not.toContain('Bot');
    });

    it('tin đi bình thường (không echo) giữ nguyên hành vi cũ', () => {
        const plainBot = { ...outgoingEcho(), content_attributes: {} };
        const container = renderMessage(plainBot);

        expect(container.querySelector('[data-testid="external-echo-label"]')).toBeNull();
        expect(container.querySelector('.right-bubble')?.className).toContain('bg-n-solid-iris');
    });

    it('tin thất bại vẫn ưu tiên bong bóng lỗi', () => {
        const failed = { ...outgoingEcho(), status: 'failed' } as ConversationMessage;
        const container = renderMessage(failed);

        expect(container.querySelector('.right-bubble')?.className).toContain('bg-n-ruby-4');
    });
});

describe('tin gửi từ ứng dụng kênh mang danh tính tài khoản kênh', () => {
    const ZALO = { key: 'zalo', name: 'Zalo', logo_url: '/brand-assets/platforms/zalo.webp' };
    const identity = (avatarUrl: string): ConversationSenderIdentity => ({
        channelAccount: { name: 'Zalo cá nhân', avatarUrl, seed: 'inbox:58', platform: ZALO },
        installation: { key: 'installation', name: 'Yona', logo_url: '/brand-assets/logo_thumbnail.png' },
    });
    const renderWithIdentity = (avatarUrl: string) =>
        render(
            <SenderIdentityContext.Provider value={identity(avatarUrl)}>
                <Message message={outgoingEcho()} channelType="Channel::Zalo" />
            </SenderIdentityContext.Provider>,
        ).container;
    const badge = (container: HTMLElement) => container.querySelector('[data-testid="avatar-platform-badge"]');
    const avatarCell = (container: HTMLElement) => container.querySelector('.\\[grid-area\\:avatar\\]');

    it('hộp thư có ảnh thì avatar là ảnh tài khoản kênh, kèm badge nền tảng', () => {
        const container = renderWithIdentity('/zalo-account.jpg');

        expect(container.querySelector('img')?.getAttribute('src')).toBe('/zalo-account.jpg');
        expect(badge(container)?.querySelector('img')?.getAttribute('alt')).toBe('Zalo');
        expect(container.textContent).not.toContain('ƯD');
        expect(container.textContent).not.toContain('NA');
    });

    it('hộp thư chưa có ảnh thì hiện avatar hình khối của hộp thư, vẫn có badge nền tảng', () => {
        const container = renderWithIdentity('');
        const sameInboxElsewhere = render(<Avatar name="Tên khác" seed="inbox:58" size={24} />).container;

        const identityOf = (root: Element | null | undefined) =>
            root?.querySelector('[data-generated-avatar]')?.getAttribute('data-generated-avatar');

        expect(identityOf(avatarCell(container))).toBe('inbox:58');
        expect(identityOf(sameInboxElsewhere)).toBe('inbox:58');
        expect(badge(container)?.querySelector('img')?.getAttribute('alt')).toBe('Zalo');
    });

    it.each([
        ['en', 'via Zalo', 'This message was sent directly from the Zalo app, not through Yona.'],
        ['vi', 'từ Zalo', 'Tin nhắn này được gửi thẳng từ ứng dụng Zalo, không qua Yona.'],
    ])('nhãn và giải thích ghi tên nền tảng của hộp thư (%s)', (locale, label, advisory) => {
        setLocale(locale);
        const container = renderWithIdentity('/zalo-account.jpg');
        setLocale('en');
        const echoLabel = container.querySelector('[data-testid="external-echo-label"]');

        expect(echoLabel?.textContent).toBe(label);
        expect(echoLabel?.getAttribute('title')).toBe(advisory);
        expect(echoLabel?.getAttribute('title')).not.toMatch(/\{|window|cửa sổ/);
    });
});

describe('lời mời kết bạn', () => {
    const friendRequest = (message?: string): ConversationMessage => ({
        id: 12,
        content: message ?? '[Friend request]',
        inbox_id: 58,
        conversation_id: 2,
        message_type: 0,
        content_type: 'text',
        status: 'sent',
        content_attributes: { friend_request: { external_id: '5550001234', message } },
        created_at: BASE_TIME,
        private: false,
        source_id: 'zalo-personal-friend-request-1',
        sender: { id: 5, name: 'Trần Thị B', type: 'contact', thumbnail: '' },
        sender_id: 5,
        sender_type: 'Contact',
    });

    it('hiện bong bóng riêng với tiêu đề Lời mời kết bạn', () => {
        const container = renderMessage(friendRequest('Chào shop'));

        expect(container.textContent).toContain('Friend request');
        expect(container.textContent).toContain('Chào shop');
    });

    it('không có lời nhắn vẫn hiện bong bóng', () => {
        const container = renderMessage(friendRequest());

        expect(container.textContent).toContain('Friend request');
    });

    it('thẻ hội thoại hiện nhãn thay cho nội dung tin', () => {
        const container = render(<MessagePreview message={friendRequest('Chào shop')} />).container;

        expect(container.textContent).toContain('[Friend request]');
        expect(container.textContent).not.toContain('Chào shop');
    });
});
