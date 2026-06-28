import { cn } from '@/lib/utils';
import { ChatAvatar } from './chat-avatar';
import { attachmentIsBare, MessageAttachment } from './message-attachment';
import { MessageQuote } from './message-quote';
import { isGroup, isOutbound, messageTime, type ChatMessage, type ChatPeer } from './message-types';

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
    const hasBody = !!(msg.body && msg.body.trim());
    const quote = msg.media_meta?.quote ?? null;
    const bare = attachmentIsBare(msg) && !hasBody && !quote; // quote/caption cần khung bubble
    const hasMedia = msg.type !== 'text';

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
                    {quote && <MessageQuote quote={quote} mine={mine} />}
                    <MessageAttachment msg={msg} mine={mine} />
                    {hasBody && <p className={cn('break-words whitespace-pre-wrap', hasMedia && !bare ? 'mt-1' : '')}>{msg.body}</p>}
                </div>

                <span className="text-muted-foreground mt-0.5 px-1 text-[10px]">{messageTime(msg)}</span>
            </div>
        </div>
    );
}
