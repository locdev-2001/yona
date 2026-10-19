import type { Contact } from './types';

// Mỗi loại kênh người này đang nhắn qua, một lần (dòng Bạn bè và thẻ hồ sơ hiện logo).
export function uniqueChannels(contact: Contact): { channel_type: string; name: string }[] {
    const byType = new Map<string, { channel_type: string; name: string }>();
    (contact.contactInboxes ?? []).forEach(({ inbox }) => {
        if (!byType.has(inbox.channelType)) byType.set(inbox.channelType, { channel_type: inbox.channelType, name: inbox.name });
    });
    return [...byType.values()];
}

const YONA_CHANNEL_TYPE = 'Channel::Yona';
const YONA_SOURCE_PREFIX = 'yona:';

// Người dùng Yona trong hộp thư mang địa chỉ "yona:{user_id}" ở kênh Yona.
export function yonaUserIdOf(contact: Contact | null): number | null {
    const sourceId = contact?.contactInboxes?.find(({ inbox }) => inbox.channelType === YONA_CHANNEL_TYPE)?.sourceId;
    return sourceId?.startsWith(YONA_SOURCE_PREFIX) ? Number(sourceId.slice(YONA_SOURCE_PREFIX.length)) : null;
}
