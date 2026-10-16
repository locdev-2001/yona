import { describe, expect, it } from 'vitest';

import type { ConversationMessage } from 'dashboard/conversation/types';
import type { ChannelPlatform } from 'shared/constants/channelPlatform';
import { t } from '../../../../i18n';
import type { ConversationSenderIdentity } from '../SenderIdentityContext';
import { externalEchoCopy, messageSenderKey, resolveMessageSender } from './senderIdentity';

const ZALO: ChannelPlatform = { key: 'zalo', name: 'Zalo', logo_url: '/brand-assets/platforms/zalo.webp' };
const YONA: ChannelPlatform = { key: 'installation', name: 'Yona', logo_url: '/brand-assets/logo_thumbnail.png' };

const IDENTITY: ConversationSenderIdentity = {
    channelAccount: { name: 'Zalo cá nhân', avatarUrl: '/zalo-account.jpg', seed: 'inbox:3', platform: ZALO },
    installation: YONA,
};

function message(overrides: Partial<ConversationMessage> = {}): ConversationMessage {
    return {
        id: 1,
        content: 'Xin chào',
        inbox_id: 59,
        conversation_id: 138,
        message_type: 1,
        content_type: 'text',
        status: 'sent',
        content_attributes: {},
        created_at: 1756707112,
        private: false,
        source_id: null,
        ...overrides,
    };
}

const CONTACT = { id: 5, name: 'Pham Nguyen', type: 'contact' as const, thumbnail: '/pham.png' };
const AGENT = { id: 2, name: 'Lộc', type: 'user' as const, thumbnail: '/loc.png' };
const BOT = { id: 7, name: 'Bot Trợ Lý', type: 'agent_bot' as const, avatar_url: '/bot.png' };

const sentBy = (name: string, platform: string) =>
    `${t('CONVERSATION.SENT_BY')} ${name} · ${t('CONVERSATION.SENT_VIA_PLATFORM', { platform })}`;

describe('người gửi của từng tin', () => {
    it('tin gửi thẳng từ ứng dụng kênh mang ảnh và tên tài khoản kênh kèm nền tảng', () => {
        const identity = resolveMessageSender(message({ content_attributes: { external_echo: true } }), IDENTITY);

        expect(identity).toEqual({
            name: 'Zalo cá nhân',
            src: '/zalo-account.jpg',
            seed: 'inbox:3',
            platform: ZALO,
            tooltip: t('CONVERSATION.NATIVE_APP_ADVISORY', { source: 'Zalo' }),
        });
    });

    it('tin từ ứng dụng kênh khi hộp thư chưa có ảnh vẫn đứng tên hộp thư, không phải "ứng dụng gốc"', () => {
        const withoutAvatar = { ...IDENTITY, channelAccount: { ...IDENTITY.channelAccount!, avatarUrl: '' } };
        const identity = resolveMessageSender(message({ content_attributes: { external_echo: true } }), withoutAvatar);

        expect(identity.name).toBe('Zalo cá nhân');
        expect(identity.name).not.toBe(t('CONVERSATION.NATIVE_APP'));
        expect(identity.src).toBe('');
        expect(identity.platform).toEqual(ZALO);
    });

    it('tin nhóm đến lấy người gửi thật trong nhóm, badge nền tảng kênh', () => {
        const identity = resolveMessageSender(
            message({
                message_type: 0,
                sender: { ...CONTACT, name: 'Nhóm Zalo' },
                sender_id: CONTACT.id,
                content_attributes: { sender: { external_id: '555', name: 'Bình', avatar: '/binh.png' } },
            }),
            IDENTITY,
        );

        expect(identity).toEqual({
            name: 'Bình',
            src: '/binh.png',
            seed: 'group_member:555',
            platform: ZALO,
            tooltip: sentBy('Bình', 'Zalo'),
        });
    });

    it('tin khách đến lấy thumbnail khách, badge nền tảng kênh', () => {
        const identity = resolveMessageSender(message({ message_type: 0, sender: CONTACT, sender_id: 5 }), IDENTITY);

        expect(identity).toEqual({
            name: 'Pham Nguyen',
            src: '/pham.png',
            seed: 'contact:5',
            platform: ZALO,
            tooltip: sentBy('Pham Nguyen', 'Zalo'),
        });
    });

    it('tin tích hợp ngoài không sender dùng senderName, badge bản cài đặt', () => {
        const identity = resolveMessageSender(
            message({ additional_attributes: { senderName: 'Slack An', senderAvatarUrl: '/an.png' } }),
            IDENTITY,
        );

        expect(identity).toEqual({ name: 'Slack An', src: '/an.png', platform: YONA, tooltip: sentBy('Slack An', 'Yona') });
    });

    it('tin không sender, không senderName là Bot của bản cài đặt', () => {
        const identity = resolveMessageSender(message(), IDENTITY);

        expect(identity.name).toBe(t('CONVERSATION.BOT'));
        expect(identity.src).toBe('');
        expect(identity.platform).toEqual(YONA);
    });

    it('tin bot lấy avatar_url, badge bản cài đặt', () => {
        const identity = resolveMessageSender(message({ sender: BOT, sender_id: 7, sender_type: 'AgentBot' }), IDENTITY);

        expect(identity).toEqual({
            name: 'Bot Trợ Lý',
            src: '/bot.png',
            seed: 'agent_bot:7',
            platform: YONA,
            tooltip: sentBy('Bot Trợ Lý', 'Yona'),
        });
    });

    it('tin nhân viên lấy thumbnail, badge bản cài đặt', () => {
        const identity = resolveMessageSender(message({ sender: AGENT, sender_id: 2, sender_type: 'User' }), IDENTITY);

        expect(identity).toEqual({
            name: 'Lộc',
            src: '/loc.png',
            seed: 'user:2',
            platform: YONA,
            tooltip: sentBy('Lộc', 'Yona'),
        });
    });

    it('không có danh tính hộp thư thì không có badge và tooltip giữ như cũ', () => {
        const agent = resolveMessageSender(message({ sender: AGENT, sender_id: 2, sender_type: 'User' }), null);
        const echo = resolveMessageSender(message({ content_attributes: { external_echo: true } }), null);

        expect(agent.platform).toBeNull();
        expect(agent.tooltip).toBe(`${t('CONVERSATION.SENT_BY')} Lộc`);
        expect(echo.platform).toBeNull();
        expect(echo.name).toBe(t('CONVERSATION.NATIVE_APP'));
        expect(echo.tooltip).toBe(t('CONVERSATION.NATIVE_APP_ADVISORY_UNKNOWN_SOURCE'));
    });

    it('tooltip nói tin đi qua nền tảng nào', () => {
        const identity = resolveMessageSender(message({ message_type: 0, sender: CONTACT, sender_id: 5 }), IDENTITY);

        expect(identity.tooltip).toContain('via Zalo');
    });
});

describe('chữ cho tin gửi thẳng từ ứng dụng kênh', () => {
    it.each([
        [ZALO, 'via Zalo', 'This message was sent directly from the Zalo app, not through Yona.'],
        [{ ...ZALO, key: 'telegram', name: 'Telegram' }, 'via Telegram', 'This message was sent directly from the Telegram app, not through Yona.'],
        [null, 'sent outside Yona', "This message was sent directly from the channel's own app, not through Yona."],
        [{ ...ZALO, name: '  ' }, 'sent outside Yona', "This message was sent directly from the channel's own app, not through Yona."],
    ])('nguồn lấy từ tên nền tảng kênh tự khai (%o)', (platform, label, advisory) => {
        expect(externalEchoCopy(platform)).toEqual({ label, advisory });
    });
});

describe('khoá người gửi để gộp tin', () => {
    const groupMessage = (externalId: string, name: string) =>
        message({
            message_type: 0,
            sender: { ...CONTACT, name: 'Nhóm Zalo' },
            sender_id: CONTACT.id,
            content_attributes: { sender: { external_id: externalId, name, avatar: '' } },
        });

    it('tin nhóm cùng sender_id nhưng khác thành viên thì khác khoá', () => {
        expect(messageSenderKey(groupMessage('1', 'Bình'))).not.toBe(messageSenderKey(groupMessage('2', 'An')));
    });

    it('cùng thành viên trong nhóm thì cùng khoá', () => {
        expect(messageSenderKey(groupMessage('1', 'Bình'))).toBe(messageSenderKey(groupMessage('1', 'Bình')));
    });

    it('tin thường khoá theo loại và id người gửi', () => {
        expect(messageSenderKey(message({ sender: AGENT, sender_id: 2 }))).toBe('user:2');
        expect(messageSenderKey(message({ sender: AGENT }))).toBe('user:2');
        expect(messageSenderKey(message({ sender_id: null }))).toBeUndefined();
    });

    it('AI và nhân viên trùng id thì khác khoá', () => {
        const staff = message({ sender: { ...AGENT, id: 1 }, sender_id: 1, sender_type: 'User' });
        const aiAgent = message({ sender: { id: 1, name: 'Linh', type: 'ai_agent' as const }, sender_id: 1, sender_type: 'AiAgent' });

        expect(messageSenderKey(staff)).not.toBe(messageSenderKey(aiAgent));
    });

    it('tin tải về và sự kiện realtime của cùng người gửi thì cùng khoá', () => {
        const loaded = message({ sender: AGENT, sender_id: 2, sender_type: 'User' });
        const realtime = message({ sender: AGENT, sender_id: 2, sender_type: null });

        expect(messageSenderKey(loaded)).toBe(messageSenderKey(realtime));
    });
});
