import { cn } from '@/lib/utils';
import { Ban, Check, CheckCheck, Reply, SmilePlus } from 'lucide-react';
import { useState } from 'react';
import { ChatAvatar } from './chat-avatar';
import { attachmentIsBare, MessageAttachment } from './message-attachment';
import { MessageQuote } from './message-quote';
import { isGroup, isOutbound, messageTime, REACTION_PALETTE, reactionChips, reactionEmoji, type ChatMessage, type ChatPeer } from './message-types';

interface Props {
    msg: ChatMessage;
    peer: ChatPeer;
    /** First message of a same-sender run → show avatar + (group) sender name. */
    showSender: boolean;
    /** P06a — bấm Trả lời (undefined = kênh/màn không hỗ trợ). */
    onReply?: (msg: ChatMessage) => void;
    /** P06a — thả reaction (icon rỗng '' = gỡ). */
    onReact?: (msg: ChatMessage, icon: string) => void;
}

/** One message row: side by direction, peer avatar/name for inbound, media + caption + time. */
export function MessageBubble({ msg, peer, showSender, onReply, onReact }: Props) {
    const mine = isOutbound(msg);
    const group = isGroup(peer);
    const recalled = !!msg.recalled_at;
    // Sticker: body là raw platform content (JSON {id,catId,type}), KHÔNG render text — ảnh do MessageAttachment lo
    const hasBody = msg.type !== 'sticker' && !!(msg.body && msg.body.trim());
    const quote = msg.media_meta?.quote ?? null;
    const bare = !recalled && attachmentIsBare(msg) && !hasBody && !quote; // quote/caption cần khung bubble
    const hasMedia = msg.type !== 'text';
    const chips = reactionChips(msg.reactions);
    const [showPalette, setShowPalette] = useState(false);
    // P06a — chỉ tin có platform metadata mới quote/react được (tin cũ: disable trung thực)
    const canInteract = !recalled && msg.quotable === true;

    // Group → per-sender name; 1-1 → peer. Per-sender avatars aren't stored yet, so groups fall back to initials.
    const senderName = group ? (msg.sender_name ?? peer.peer_name) : peer.peer_name;
    const senderAvatar = group ? null : peer.peer_avatar_url;

    return (
        <div className={cn('group flex w-full gap-2', mine ? 'justify-end' : 'justify-start')}>
            {!mine && <div className="w-8 shrink-0 self-end">{showSender ? <ChatAvatar name={senderName} src={senderAvatar} /> : null}</div>}

            {/* P06a — action bar hover (đặt trước bubble khi mine để nằm phía trong) */}
            {mine && canInteract && (onReply || onReact) && (
                <BubbleActions msg={msg} onReply={onReply} onReact={onReact} showPalette={showPalette} setShowPalette={setShowPalette} />
            )}

            <div className={cn('flex max-w-[72%] flex-col', mine ? 'items-end' : 'items-start')}>
                {!mine && group && showSender && senderName && <span className="text-muted-foreground mb-0.5 px-1 text-xs">{senderName}</span>}

                <div
                    className={cn(
                        'w-fit text-sm',
                        bare
                            ? 'p-0'
                            : cn('rounded-2xl px-3 py-2', mine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'),
                    )}
                >
                    {recalled ? (
                        // P03 — tin thu hồi: ẩn body/media, dòng italic trung tính
                        <p className="flex items-center gap-1 italic opacity-70">
                            <Ban className="h-3.5 w-3.5" /> Tin nhắn đã được thu hồi
                        </p>
                    ) : (
                        <>
                            {quote && <MessageQuote quote={quote} mine={mine} />}
                            <MessageAttachment msg={msg} mine={mine} />
                            {hasBody && <p className={cn('break-words whitespace-pre-wrap', hasMedia && !bare ? 'mt-1' : '')}>{msg.body}</p>}
                        </>
                    )}
                </div>

                {/* P03 — reaction chips (2 chiều: khách thả + mình thả qua echo) */}
                {chips.length > 0 && (
                    <div className="mt-0.5 flex gap-1 px-1">
                        {chips.map((c) => (
                            <span key={c.emoji} className="bg-muted rounded-full border px-1.5 py-0.5 text-[11px] leading-none">
                                {c.emoji}
                                {c.count > 1 && <span className="text-muted-foreground ml-0.5">{c.count}</span>}
                            </span>
                        ))}
                    </div>
                )}

                <span className="text-muted-foreground mt-0.5 flex items-center gap-1 px-1 text-[10px]">
                    {messageTime(msg)}
                    {/* P03 — receipt CHỈ 1-1 (nhóm per-member, scalar vô nghĩa) + chỉ tin mình gửi.
                        Kênh không có receipt → field null → không render gì (không phải "chưa xem"). */}
                    {mine &&
                        !group &&
                        !recalled &&
                        (msg.seen_at ? (
                            <span className="text-primary flex items-center gap-0.5">
                                <CheckCheck className="h-3 w-3" /> Đã xem
                            </span>
                        ) : msg.delivered_at ? (
                            <CheckCheck className="h-3 w-3" />
                        ) : msg.source_id ? (
                            <Check className="h-3 w-3" />
                        ) : null)}
                </span>
            </div>

            {!mine && canInteract && (onReply || onReact) && (
                <BubbleActions msg={msg} onReply={onReply} onReact={onReact} showPalette={showPalette} setShowPalette={setShowPalette} />
            )}
        </div>
    );
}

/** P06a — nút Trả lời + palette reaction, chỉ hiện khi hover row. */
function BubbleActions({
    msg,
    onReply,
    onReact,
    showPalette,
    setShowPalette,
}: {
    msg: ChatMessage;
    onReply?: (msg: ChatMessage) => void;
    onReact?: (msg: ChatMessage, icon: string) => void;
    showPalette: boolean;
    setShowPalette: (v: boolean) => void;
}) {
    return (
        <div className="relative flex items-center gap-0.5 self-center opacity-0 transition-opacity group-hover:opacity-100">
            {onReply && (
                <button type="button" className="text-muted-foreground hover:bg-muted rounded p-1" onClick={() => onReply(msg)} aria-label="Trả lời">
                    <Reply className="h-3.5 w-3.5" />
                </button>
            )}
            {onReact && (
                <button
                    type="button"
                    className="text-muted-foreground hover:bg-muted rounded p-1"
                    onClick={() => setShowPalette(!showPalette)}
                    aria-label="Thả cảm xúc"
                >
                    <SmilePlus className="h-3.5 w-3.5" />
                </button>
            )}
            {showPalette && onReact && (
                <div className="bg-popover absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-full border px-2 py-1 shadow-md">
                    {REACTION_PALETTE.map((icon) => (
                        <button
                            key={icon}
                            type="button"
                            className="hover:scale-125"
                            onClick={() => {
                                setShowPalette(false);
                                onReact(msg, icon);
                            }}
                        >
                            {reactionEmoji(icon)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
