import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import type { MessageGroupPosition } from 'shared/helpers/messageGrouping';
import Message from './Message';
import MessageList from './MessageList';
import { SenderIdentityContext } from './SenderIdentityContext';
import type { ConversationSenderIdentity } from './SenderIdentityContext';
import type { ConversationMessage } from 'dashboard/conversation/types';

// Avatar người gửi ở hai phía khung chat: khách/thành viên nhóm bên trái kèm badge
// nền tảng kênh, tin gửi từ trong ứng dụng bên phải kèm badge bản cài đặt.
const BASE_TIME = 1756707112;
const IDENTITY: ConversationSenderIdentity = {
    channelAccount: {
        name: 'Nguyễn Phước Lộc',
        avatarUrl: '/zalo-account.jpg',
        platform: { key: 'zalo', name: 'Zalo', logo_url: '/brand-assets/platforms/zalo.webp' },
    },
    installation: { key: 'installation', name: 'Yona', logo_url: '/brand-assets/logo_thumbnail.png' },
};
const CONTACT = { id: 5, name: 'Pham Nguyen', type: 'contact' as const, thumbnail: '/pham.png' };
const AGENT = { id: 2, name: 'Lộc', type: 'user' as const, thumbnail: '/loc.png' };

function message(id: number, overrides: Partial<ConversationMessage> = {}): ConversationMessage {
    return {
        id,
        content: `tin ${id}`,
        inbox_id: 59,
        conversation_id: 138,
        message_type: 0,
        content_type: 'text',
        status: 'sent',
        content_attributes: {},
        created_at: BASE_TIME,
        private: false,
        source_id: null,
        sender: CONTACT,
        sender_type: 'Contact',
        sender_id: CONTACT.id,
        ...overrides,
    };
}

const withIdentity = (children: ReactNode) => (
    <SenderIdentityContext.Provider value={IDENTITY}>{children}</SenderIdentityContext.Provider>
);
const renderMessage = (payload: ConversationMessage, groupPosition: MessageGroupPosition = 'single') =>
    render(withIdentity(<Message message={payload} channelType="Channel::Zalo" groupPosition={groupPosition} />))
        .container;
const avatarCell = (scope: ParentNode) => scope.querySelector('.\\[grid-area\\:avatar\\]');
const badgeLogo = (scope: ParentNode) => scope.querySelector('[data-testid="avatar-platform-badge"] img');

describe('avatar người gửi trên bong bóng', () => {
    it('tin khách bên trái có avatar khách kèm badge nền tảng kênh', () => {
        const container = renderMessage(message(1));

        expect(avatarCell(container)?.querySelector('img')?.getAttribute('src')).toBe('/pham.png');
        expect(badgeLogo(container)?.getAttribute('alt')).toBe('Zalo');
        expect(avatarCell(container)?.getAttribute('title')).toContain('via Zalo');
    });

    it('tin nhân viên gửi từ ứng dụng có badge bản cài đặt', () => {
        const container = renderMessage(message(2, { message_type: 1, sender: AGENT, sender_type: 'User', sender_id: 2 }));

        expect(avatarCell(container)?.querySelector('img')?.getAttribute('src')).toBe('/loc.png');
        expect(badgeLogo(container)?.getAttribute('alt')).toBe('Yona');
    });

    it('tin hoạt động không có avatar', () => {
        const container = renderMessage(message(3, { message_type: 2, sender: undefined, sender_id: null }));

        expect(avatarCell(container)).toBeNull();
    });

    it('tin còn gộp với tin kế thì không vẽ avatar', () => {
        const container = renderMessage(message(4), 'first');

        expect(avatarCell(container)).toBeNull();
    });
});

describe('gộp tin nhóm theo người gửi thật', () => {
    const groupMessage = (id: number, externalId: string, name: string) =>
        message(id, {
            sender: { ...CONTACT, name: 'Nhóm khách sỉ' },
            content_attributes: { sender: { external_id: externalId, name, avatar: `/${externalId}.png` } },
        });

    it('hai thành viên nhắn cùng phút thì mỗi người một avatar trái', () => {
        const { container } = render(
            withIdentity(
                <MessageList
                    messages={[groupMessage(10, 'binh', 'Bình'), groupMessage(11, 'an', 'An')]}
                    channelType="Channel::Zalo"
                />,
            ),
        );

        expect(container.querySelector('#message10')).not.toHaveClass('group-with-next');
        expect(avatarCell(container.querySelector('#message10')!)?.querySelector('img')?.getAttribute('src')).toBe(
            '/binh.png',
        );
        expect(avatarCell(container.querySelector('#message11')!)?.querySelector('img')?.getAttribute('src')).toBe(
            '/an.png',
        );
    });

    it('cùng một thành viên nhắn liền nhau vẫn gộp như cũ', () => {
        const { container } = render(
            withIdentity(
                <MessageList
                    messages={[groupMessage(12, 'binh', 'Bình'), groupMessage(13, 'binh', 'Bình')]}
                    channelType="Channel::Zalo"
                />,
            ),
        );

        expect(container.querySelector('#message12')).toHaveClass('group-with-next');
        expect(avatarCell(container.querySelector('#message12')!)).toBeNull();
    });
});
