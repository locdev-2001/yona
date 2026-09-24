import type { ConversationMessage } from 'dashboard/conversation/types';
import type { ChannelPlatform } from 'shared/constants/channelPlatform';
import { t } from '../../../../i18n';

import { MESSAGE_TYPES, SENDER_TYPES } from '../constants';
import type { ConversationSenderIdentity } from '../SenderIdentityContext';
import { readGroupSender } from './groupSender';

// Sender nào thuộc nhóm bot thì đứng bên phải như tin nhân viên và lấy ảnh theo avatar_url.
export const BOT_SENDER_TYPES: string[] = [SENDER_TYPES.AGENT_BOT, SENDER_TYPES.CAPTAIN_ASSISTANT];

export interface MessageSenderIdentity {
    name: string;
    src: string;
    platform: ChannelPlatform | null;
    tooltip: string;
}

function sentByTooltip(name: string, platform: ChannelPlatform | null): string {
    if (!name) return '';

    const sentBy = `${t('CONVERSATION.SENT_BY')} ${name}`;

    return platform ? `${sentBy} · ${t('CONVERSATION.SENT_VIA_PLATFORM', { platform: platform.name })}` : sentBy;
}

/**
 * Ai đứng sau một tin nhắn: tên, ảnh và nền tảng để vẽ badge. Rẽ nhánh theo loại
 * tin và khoá trung tính (`external_echo`, `content_attributes.sender`), không theo
 * kênh — echo của mọi kênh đi chung một đường.
 */
export function resolveMessageSender(
    message: ConversationMessage,
    identity: ConversationSenderIdentity | null,
): MessageSenderIdentity {
    const contentAttributes = message.content_attributes ?? {};
    const sender = message.sender ?? null;
    const channelAccount = identity?.channelAccount ?? null;
    const channelPlatform = channelAccount?.platform ?? null;
    const installation = identity?.installation ?? null;

    if (contentAttributes.external_echo) {
        return {
            name: channelAccount?.name || t('CONVERSATION.NATIVE_APP'),
            src: channelAccount?.avatarUrl ?? '',
            platform: channelPlatform,
            tooltip: t('CONVERSATION.NATIVE_APP_ADVISORY'),
        };
    }

    const build = (name: string, src: string, platform: ChannelPlatform | null): MessageSenderIdentity => ({
        name,
        src,
        platform,
        tooltip: sentByTooltip(name, platform),
    });

    if (message.message_type === MESSAGE_TYPES.INCOMING) {
        const groupSender = readGroupSender(contentAttributes);
        if (groupSender) return build(groupSender.name, groupSender.avatar, channelPlatform);
        if (sender) return build(sender.name ?? '', sender.thumbnail ?? '', channelPlatform);
    }

    if (!sender) {
        const { senderName, senderAvatarUrl } = message.additional_attributes ?? {};

        return senderName
            ? build(senderName, senderAvatarUrl ?? '', installation)
            : build(t('CONVERSATION.BOT'), '', installation);
    }

    if (BOT_SENDER_TYPES.includes(sender.type)) {
        return build(sender.name ?? '', sender.avatar_url ?? '', installation);
    }

    return build(sender.name ?? '', sender.thumbnail ?? '', installation);
}

/**
 * Khoá người gửi để gộp tin liền nhau. Tin nhóm cùng `sender_id` (hồ sơ của nhóm)
 * nhưng khác thành viên thì phải tách cụm, nên ưu tiên người gửi thật trong nhóm.
 */
export function messageSenderKey(message: ConversationMessage): string | number | null | undefined {
    const groupSender = readGroupSender(message.content_attributes ?? {});
    if (groupSender) return `group:${groupSender.externalId || groupSender.name}`;

    return message.sender_id ?? message.sender?.id;
}
