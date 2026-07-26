// Kiểu dữ liệu chat trung tính — dùng lại cho mọi kênh trong hộp thư.
// Mirror the serialized Message/Conversation models (controller returns full models as JSON).

export type MessageDirection = 'in' | 'out' | 'echo';

export type MessageType = 'text' | 'image' | 'gif' | 'video' | 'audio' | 'file' | 'sticker' | 'business_card' | 'bank_card' | 'call' | (string & {});

export interface StickerMeta {
    url?: string | null;
    thumbnail?: string | null;
    description?: string | null;
}

export interface BusinessCardMeta {
    name?: string | null;
    title?: string | null;
    phone?: string | null;
    thumbnail?: string | null;
    url?: string | null;
    qr_code_url?: string | null;
    contact_uid?: string | null;
}

/** Thẻ tài khoản ngân hàng — adapter của kênh resolve từ template VietQR. */
export interface BankCardMeta {
    bank_name?: string | null;
    bank_bin?: string | null;
    account_number?: string | null;
    account_holder?: string | null;
    logo_url?: string | null;
    qr_url?: string | null;
}

export interface CallMeta {
    media?: 'voice' | 'video' | (string & {});
    direction?: 'inbound' | 'outbound' | (string & {});
    outcome?: 'completed' | 'missed' | 'busy' | 'canceled' | (string & {});
    duration_seconds?: number;
    /** Tin cũ trước khi chuẩn hóa call payload. */
    type?: string | number;
    duration?: number;
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
    bank_card?: BankCardMeta;
    call?: CallMeta | null;
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
    /** Client-only: tin optimistic đang chờ server xác nhận — server không bao giờ trả field này. */
    pending?: boolean;
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

/** Group member profile, upserted server-side from live inbound messages. */
export interface ChatParticipant {
    name?: string | null;
    avatar?: string | null;
}

/** The peer side of a thread — a Conversation is structurally compatible. */
export interface ChatPeer {
    sender_uid: string;
    thread_name: string | null;
    sender_phone: string | null;
    thread_avatar?: string | null;
    thread_kind: string; // 'direct' | 'group'
    /** Group threads: sender_uid → profile (avatar/tên per-sender). */
}

/** Outbound = anything the connected account sent — portal ('out') OR own phone ('echo'). Only 'in' is the peer. */
export function isOutbound(msg: Pick<ChatMessage, 'direction'>): boolean {
    return msg.direction !== 'in';
}

export function isGroup(peer: Pick<ChatPeer, 'thread_kind'>): boolean {
    return peer.thread_kind === 'group';
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

/**
 * Body không dành cho mắt người → không render làm text/caption:
 * sticker = raw platform JSON {id,catId,type}; bank_card = nhãn fallback
 * trùng nội dung card (card component đã show đủ).
 */
export function messageBodyIsRedundant(msg: Pick<ChatMessage, 'type'>): boolean {
    return msg.type === 'sticker' || msg.type === 'bank_card';
}

/** One-line preview for the conversation list, by type. */
export function messagePreview(msg: Pick<ChatMessage, 'type' | 'body'>): string {
    if (!messageBodyIsRedundant(msg) && msg.body && msg.body.trim()) return msg.body;
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
        case 'bank_card':
            return '[Tài khoản ngân hàng]';
        case 'call':
            return '[Cuộc gọi]';
        default:
            return '';
    }
}
