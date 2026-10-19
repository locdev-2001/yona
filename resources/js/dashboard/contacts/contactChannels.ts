import type { Contact } from './types';

// Mỗi loại kênh người này đang nhắn qua, một lần (dòng Bạn bè và thẻ hồ sơ hiện logo).
export function uniqueChannels(contact: Contact): { channel_type: string; name: string }[] {
    const byType = new Map<string, { channel_type: string; name: string }>();
    (contact.contactInboxes ?? []).forEach(({ inbox }) => {
        if (!byType.has(inbox.channelType)) byType.set(inbox.channelType, { channel_type: inbox.channelType, name: inbox.name });
    });
    return [...byType.values()];
}
