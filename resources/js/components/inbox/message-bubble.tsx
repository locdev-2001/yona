import { cn } from '@/lib/utils';
import { Ban, Check, CheckCheck } from 'lucide-react';
import { ChatAvatar } from './chat-avatar';
import { attachmentIsBare, MessageAttachment } from './message-attachment';
import { MessageQuote } from './message-quote';
import { isGroup, isOutbound, messageTime, reactionChips, type ChatMessage, type ChatPeer } from './message-types';

interface Props {
    msg: ChatMessage;
    peer: ChatPeer;
    /** First message of a same-sender run → show avatar + (group) sender name. */
    showSender: boolean;
}

/** One message row: side by direction, peer avatar/name for inbound, media + caption + time. */
export function MessageBubble({ msg, peer, showSender }: Props) {
    const mine = isOutbound(msg);
    const group = isGroup(peer);
    const recalled = !!msg.recalled_at;
    const hasBody = !!(msg.body && msg.body.trim());
    const quote = msg.media_meta?.quote ?? null;
    const bare = !recalled && attachmentIsBare(msg) && !hasBody && !quote; // quote/caption cần khung bubble
    const hasMedia = msg.type !== 'text';
    const chips = reactionChips(msg.reactions);

    // Group → per-sender name; 1-1 → peer. Per-sender avatars aren't stored yet, so groups fall back to initials.
    const senderName = group ? (msg.sender_name ?? peer.peer_name) : peer.peer_name;
    const senderAvatar = group ? null : peer.peer_avatar_url;

    return (
        <div className={cn('flex w-full gap-2', mine ? 'justify-end' : 'justify-start')}>
            {!mine && <div className="w-8 shrink-0 self-end">{showSender ? <ChatAvatar name={senderName} src={senderAvatar} /> : null}</div>}

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
                    {mine && !group && !recalled && (
                        msg.seen_at ? (
                            <span className="text-primary flex items-center gap-0.5">
                                <CheckCheck className="h-3 w-3" /> Đã xem
                            </span>
                        ) : msg.delivered_at ? (
                            <CheckCheck className="h-3 w-3" />
                        ) : msg.source_id ? (
                            <Check className="h-3 w-3" />
                        ) : null
                    )}
                </span>
            </div>
        </div>
    );
}
