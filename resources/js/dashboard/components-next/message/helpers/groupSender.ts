// Tin nhóm: một hội thoại gom nhiều người gửi, nên mỗi tin mang người gửi thật
// trong `content_attributes.sender` và danh sách nhắc tên trong
// `content_attributes.mentions` (docs/channel-capabilities.md §2.4 `group_threads`).
// Khoá chuẩn hoá, không mang tên riêng của nền tảng — bong bóng lõi đọc chung.

export interface GroupSender {
    externalId: string;
    name: string;
    avatar: string;
}

export interface GroupMention {
    name: string;
    offset: number;
    length: number;
}

export function readGroupSender(contentAttributes: Record<string, unknown>): GroupSender | null {
    const raw = contentAttributes.sender;
    if (!raw || typeof raw !== 'object') return null;

    const { external_id: externalId, name, avatar } = raw as Record<string, unknown>;
    const displayName = typeof name === 'string' ? name.trim() : '';
    if (!displayName) return null;

    return {
        externalId: typeof externalId === 'string' ? externalId : '',
        name: displayName,
        avatar: typeof avatar === 'string' ? avatar : '',
    };
}

export function readGroupMentions(contentAttributes: Record<string, unknown>): GroupMention[] {
    const raw = contentAttributes.mentions;
    if (!Array.isArray(raw)) return [];

    return raw.flatMap(item => {
        if (!item || typeof item !== 'object') return [];
        const { name, offset, length } = item as Record<string, unknown>;
        if (typeof name !== 'string' || !name.trim()) return [];

        return [
            {
                name: name.trim(),
                offset: typeof offset === 'number' ? offset : -1,
                length: typeof length === 'number' ? length : 0,
            },
        ];
    });
}

/**
 * Tô đậm đoạn `@tên` bằng cú pháp markdown để đi qua đúng MessageFormatter của
 * lõi (không chèn HTML thô). Ưu tiên offset/length do kênh cấp; offset không
 * khớp (tin đã bị cắt/sửa) thì lùi về tìm chuỗi `@tên`.
 */
export function emphasizeMentions(content: string, mentions: GroupMention[]): string {
    if (!content || !mentions.length) return content;

    let result = content;

    const byOffsetDesc = [...mentions].sort((a, b) => b.offset - a.offset);
    const applied: GroupMention[] = [];

    byOffsetDesc.forEach(mention => {
        const { offset, length } = mention;
        if (offset < 0 || length <= 0 || offset + length > result.length) return;
        if (!result.slice(offset, offset + length).startsWith('@')) return;

        result = `${result.slice(0, offset)}**${result.slice(offset, offset + length)}**${result.slice(offset + length)}`;
        applied.push(mention);
    });

    mentions
        .filter(mention => !applied.includes(mention))
        .forEach(mention => {
            const needle = `@${mention.name}`;
            if (!result.includes(needle) || result.includes(`**${needle}**`)) return;
            result = result.split(needle).join(`**${needle}**`);
        });

    return result;
}
