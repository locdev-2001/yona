// Channel-agnostic chat types + helpers — reused by every inbox channel (Zalo, Messenger, TikTok…).
// Mirror the serialized Message/Conversation models (controller returns full models as JSON).

export type MessageDirection = 'in' | 'out' | 'echo';

export type MessageType = 'text' | 'image' | 'gif' | 'video' | 'audio' | 'file' | 'sticker' | 'business_card' | 'call' | (string & {});

export interface StickerMeta {
    url?: string | null;
    thumbnail?: string | null;
    description?: string | null;
}

export interface BusinessCardMeta {
    name?: string | null;
    phone?: string | null;
    qr_code_url?: string | null;
}

/** Tin được trả lời (reply/quote) — bridge trích từ message.data.quote (TQuote). */
export interface QuoteMeta {
    text?: string | null;
    sender_name?: string | null;
    sender?: { name?: string | null } | null;
    msg_type?: string | null;
    cli_msg_type?: number | null;
    thumb?: string | null; // ảnh thu nhỏ khi reply tới media
    attach_type?: string | null;
    sticker_ref?: unknown;
}

export interface MediaMeta {
    sticker?: StickerMeta;
    business_card?: BusinessCardMeta;
    call?: { type?: string | number; duration?: number } | null;
    media_filename?: string;
    quote?: QuoteMeta | null;
    /** P04 — media outbound từ portal (private disk, media_url = route show bền). */
    media_kind?: string;
    attachment_id?: string;
}

/** P03 — reaction đã ghi DB (P02 pipeline). icon = raw platform (vd "/-heart") hoặc emoji. */
export interface MessageReactionInfo {
    reactor_uid: string;
    icon: string;
    reacted_at: string;
}

export interface ChatMessage {
    id: string;
    conversation_id: string;
    direction: MessageDirection;
    type: MessageType;
    body: string | null;
    media_url: string | null;
    media_meta?: MediaMeta | null;
    source_id?: string | null;
    platform_sent_at: string | null;
    sender_uid?: string | null;
    sender_name: string | null;
    created_at: string;
    /** P03 — message-state (null nếu kênh không hỗ trợ / tin cũ). */
    recalled_at?: string | null;
    delivered_at?: string | null;
    seen_at?: string | null;
    reactions?: MessageReactionInfo[];
    /** P06a — tin có platform metadata mới quote/react được (tin cũ → disable nút). */
    quotable?: boolean;
}

/** P06a — palette reaction chuẩn (icon = mã zca, hiển thị qua reactionEmoji). */
export const REACTION_PALETTE = ['/-heart', '/-strong', ':>', ':o', ':-((', ':-h'] as const;

/** P06a — sticker item từ search (GET /inbox/.../stickers). */
export interface StickerItem {
    id: number;
    cateId: number;
    type: number;
    url: string | null;
    thumbnail: string | null;
    description: string | null;
}

/** Payload broadcast MessageStateChanged (P02). */
export interface MessageStatePayload {
    conversation_id: string;
    message_id: string;
    state: 'recalled' | 'delivered' | 'seen' | 'reaction' | (string & {});
    recalled_at: string | null;
    delivered_at: string | null;
    seen_at: string | null;
    reactions: MessageReactionInfo[];
}

/** Map icon reaction platform → emoji hiển thị. Icon lạ/emoji sẵn → trả nguyên. */
const REACTION_ICON_EMOJI: Record<string, string> = {
    '/-heart': '❤️',
    '/-strong': '👍',
    ':>': '😆',
    ':o': '😮',
    ':-((': '😢',
    ':-h': '😡',
    ':-*': '😘',
    ":')": '🥲',
    '/-ok': '👌',
    '/-rose': '🌹',
    '/-break': '💔',
    '/-weak': '👎',
    ':))': '🤣',
};

export function reactionEmoji(icon: string): string {
    return REACTION_ICON_EMOJI[icon] ?? icon;
}

/** Gom reactions thành chips {emoji, count} giữ thứ tự xuất hiện. */
export function reactionChips(reactions: MessageReactionInfo[] | undefined): { emoji: string; count: number }[] {
    const chips: { emoji: string; count: number }[] = [];
    for (const r of reactions ?? []) {
        const emoji = reactionEmoji(r.icon);
        const hit = chips.find((c) => c.emoji === emoji);
        if (hit) hit.count += 1;
        else chips.push({ emoji, count: 1 });
    }
    return chips;
}

/** P05 — item trong stream hợp nhất (GET .../stream): message hoặc gap marker. */
export type StreamItem = (ChatMessage & { item_type: 'message' }) | import('./gap-marker').GapEvent;

export function isStreamMessage(item: StreamItem): item is ChatMessage & { item_type: 'message' } {
    return item.item_type === 'message';
}

/** The peer side of a thread — a Conversation is structurally compatible. */
export interface ChatPeer {
    peer_uid: string;
    peer_name: string | null;
    peer_phone: string | null;
    peer_avatar_url?: string | null;
    thread_type: number; // 1 = group
}

/** Outbound = anything the connected account sent — portal ('out') OR own phone ('echo'). Only 'in' is the peer. */
export function isOutbound(msg: Pick<ChatMessage, 'direction'>): boolean {
    return msg.direction !== 'in';
}

export function isGroup(peer: Pick<ChatPeer, 'thread_type'>): boolean {
    return peer.thread_type === 1;
}

/** "Phước Lộc" → "PL", max 2 chars. */
export function initials(name: string | null | undefined): string {
    const clean = (name ?? '').trim();
    if (!clean) return '?';
    const parts = clean.split(/\s+/).filter(Boolean);
    const chars = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : clean.slice(0, 2);
    return chars.toUpperCase();
}

export function messageTime(msg: Pick<ChatMessage, 'platform_sent_at' | 'created_at'>): string {
    const iso = msg.platform_sent_at ?? msg.created_at;
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function dayLabel(msg: Pick<ChatMessage, 'platform_sent_at' | 'created_at'>): string {
    const iso = msg.platform_sent_at ?? msg.created_at;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toDateString() === new Date().toDateString()
        ? 'Hôm nay'
        : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** One-line preview for the conversation list, by type. */
export function messagePreview(msg: Pick<ChatMessage, 'type' | 'body'>): string {
    // Sticker: body là raw platform content (JSON {id,catId,type}) — không bao giờ là text người đọc
    if (msg.type !== 'sticker' && msg.body && msg.body.trim()) return msg.body;
    switch (msg.type) {
        case 'image':
            return '[Hình ảnh]';
        case 'gif':
            return '[GIF]';
        case 'video':
            return '[Video]';
        case 'audio':
            return '[Tin nhắn thoại]';
        case 'file':
            return '[Tệp đính kèm]';
        case 'sticker':
            return '[Sticker]';
        case 'business_card':
            return '[Danh thiếp]';
        case 'call':
            return '[Cuộc gọi]';
        default:
            return '';
    }
}
