import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { MessageBubble } from './message-bubble';
import { dayLabel, isOutbound, type ChatMessage, type ChatPeer } from './message-types';

interface Props {
    messages: ChatMessage[];
    peer: ChatPeer;
    loading?: boolean;
}

/** Reusable chat transcript: day separators, sender grouping, auto-scroll. Channel-agnostic. */
export function ChatThread({ messages, peer, loading }: Props) {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (loading) {
        return (
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {[0, 1, 2].map((i) => (
                    <div key={i} className={i % 2 ? 'flex justify-end' : 'flex justify-start gap-2'}>
                        {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
                        <Skeleton className="h-10 w-48 rounded-2xl" />
                    </div>
                ))}
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 p-4 text-sm">
                <MessageCircle className="h-8 w-8 opacity-30" />
                Chưa có tin nhắn nào.
            </div>
        );
    }

    let lastDay = '';
    return (
        <div className="flex-1 space-y-1 overflow-y-auto p-4">
            {messages.map((msg, i) => {
                const day = dayLabel(msg);
                const showDay = day !== lastDay;
                lastDay = day;

                const prev = messages[i - 1];
                // Start a new visual run on day change, side change, or sender change.
                const showSender = showDay || !prev || isOutbound(prev) !== isOutbound(msg) || (prev.sender_uid ?? null) !== (msg.sender_uid ?? null);

                return (
                    <div key={msg.id}>
                        {showDay && (
                            <div className="text-muted-foreground my-3 text-center text-[11px]">
                                <span className="bg-muted rounded-full px-2 py-0.5">{day}</span>
                            </div>
                        )}
                        <div className={showSender ? 'mt-2' : ''}>
                            <MessageBubble msg={msg} peer={peer} showSender={showSender} />
                        </div>
                    </div>
                );
            })}
            <div ref={endRef} />
        </div>
    );
}
