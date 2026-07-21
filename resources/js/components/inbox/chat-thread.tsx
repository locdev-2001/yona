import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import { GapMarker } from './gap-marker';
import { MessageBubble } from './message-bubble';
import { dayLabel, isOutbound, isStreamMessage, type ChatMessage, type ChatPeer, type StreamItem } from './message-types';

/** Cách đáy dưới ngưỡng này vẫn coi là "đang ở đáy" → tin mới tự cuộn xuống. */
const NEAR_BOTTOM_PX = 160;

/** Cách đỉnh dưới ngưỡng này → tự tải trang tin cũ hơn (infinite scroll lùi). */
const LOAD_MORE_THRESHOLD_PX = 80;

interface Props {
    items: StreamItem[];
    peer: ChatPeer;
    loading?: boolean;
    /** Infinite scroll lùi: còn trang cũ hơn + callback tải (undefined = tắt). */
    hasMore?: boolean;
    loadingMore?: boolean;
    onLoadMore?: () => void;
    /** P06a — callbacks tương tác (undefined = ẩn action). */
    onReply?: (msg: ChatMessage) => void;
    onReact?: (msg: ChatMessage, icon: string) => void;
}

/** Reusable chat transcript: day separators, sender grouping, gap markers, auto-scroll. Channel-agnostic. */
export function ChatThread({ items, peer, loading, hasMore, loadingMore, onLoadMore, onReply, onReact }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    // Neo scroll theo id đầu/cuối trang trước: cuối đổi = append (cuộn xuống nếu đang
    // ở đáy hoặc tin của mình), đầu đổi = prepend tin cũ (bù chiều cao, giữ chỗ đang đọc).
    const anchorRef = useRef<{ firstId: string | null; lastId: string | null; scrollHeight: number }>({
        firstId: null,
        lastId: null,
        scrollHeight: 0,
    });

    useLayoutEffect(() => {
        if (items.length === 0) {
            anchorRef.current = { firstId: null, lastId: null, scrollHeight: 0 };
            return;
        }
        const el = containerRef.current;
        if (!el) return;

        const firstId = items[0].id;
        const lastItem = items[items.length - 1];
        const prev = anchorRef.current;

        if (lastItem.id !== prev.lastId) {
            if (prev.lastId === null) {
                // Mở thread: nhảy thẳng xuống đáy, không animation
                el.scrollTop = el.scrollHeight;
            } else {
                const nearBottom = prev.scrollHeight - (el.scrollTop + el.clientHeight) < NEAR_BOTTOM_PX;
                // Tin mình gửi luôn cuộn xuống; tin khách chỉ cuộn khi đang ở đáy
                // (đang đọc lịch sử phía trên thì không giật mất chỗ)
                if (nearBottom || (isStreamMessage(lastItem) && isOutbound(lastItem))) {
                    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
                }
            }
        } else if (firstId !== prev.firstId) {
            // Prepend trang cũ: giữ nguyên vị trí đọc bằng cách bù phần chiều cao mới
            el.scrollTop += el.scrollHeight - prev.scrollHeight;
        }

        anchorRef.current = { firstId, lastId: lastItem.id, scrollHeight: el.scrollHeight };

        // Trang đầu ngắn hơn viewport → không có scrollbar để kéo → tự tải tiếp cho đầy
        if (hasMore && !loadingMore && el.scrollHeight <= el.clientHeight) {
            onLoadMore?.();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    function handleScroll(e: React.UIEvent<HTMLDivElement>) {
        if (hasMore && !loadingMore && e.currentTarget.scrollTop < LOAD_MORE_THRESHOLD_PX) {
            onLoadMore?.();
        }
    }

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
        <div ref={containerRef} onScroll={handleScroll} className="flex-1 space-y-1 overflow-y-auto p-4">
            {loadingMore && <div className="text-muted-foreground py-1 text-center text-[11px]">Đang tải tin cũ hơn…</div>}
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
                    showDay ||
                    !lastMessage ||
                    isOutbound(lastMessage) !== isOutbound(item) ||
                    (lastMessage.sender_uid ?? null) !== (item.sender_uid ?? null);
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
        </div>
    );
}
