import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { GapMarker } from './gap-marker';
import { MessageBubble } from './message-bubble';
import { dayLabel, isOutbound, isStreamMessage, type ChatMessage, type ChatPeer, type StreamItem } from './message-types';

interface Props {
    items: StreamItem[];
    peer: ChatPeer;
    loading?: boolean;
    /** P06a — callbacks tương tác (undefined = ẩn action). */
    onReply?: (msg: ChatMessage) => void;
    onReact?: (msg: ChatMessage, icon: string) => void;
}

/** Reusable chat transcript: day separators, sender grouping, gap markers, auto-scroll. Channel-agnostic. */
export function ChatThread({ items, peer, loading, onReply, onReact }: Props) {
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [items]);

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

    if (items.length === 0) {
        return (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 p-4 text-sm">
                <MessageCircle className="h-8 w-8 opacity-30" />
                Chưa có tin nhắn nào.
            </div>
        );
    }

    let lastDay = '';
    // Tin liền trước để nhóm sender — reset về null sau gap marker (luôn hiện sender fresh sau chỗ ngắt).
    let lastMessage: (StreamItem & { item_type: 'message' }) | null = null;

    return (
        <div className="flex-1 space-y-1 overflow-y-auto p-4">
            {items.map((item) => {
                if (!isStreamMessage(item)) {
                    lastMessage = null;

                    return (
                        <div key={item.id}>
                            <GapMarker event={item} />
                        </div>
                    );
                }

                const day = dayLabel(item);
                const showDay = day !== lastDay;
                lastDay = day;

                const showSender =
                    showDay || !lastMessage || isOutbound(lastMessage) !== isOutbound(item) || (lastMessage.sender_uid ?? null) !== (item.sender_uid ?? null);
                lastMessage = item;

                return (
                    <div key={item.id}>
                        {showDay && (
                            <div className="text-muted-foreground my-3 text-center text-[11px]">
                                <span className="bg-muted rounded-full px-2 py-0.5">{day}</span>
                            </div>
                        )}
                        <div className={showSender ? 'mt-2' : ''}>
                            <MessageBubble msg={item} peer={peer} showSender={showSender} onReply={onReply} onReact={onReact} />
                        </div>
                    </div>
                );
            })}
            <div ref={endRef} />
        </div>
    );
}
