import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { ChevronLeft, ChevronRight } from './icons';
import { kt } from './primitives';

/**
 * Trượt ngang bằng scroll-snap của trình duyệt (vuốt, lăn, bàn phím đều chạy),
 * chấm vị trí + nút trước/sau. Dùng cho nhiều thẻ sản phẩm; tin dài nằm ngang,
 * không kéo dài khung chat.
 */
export function Carousel({ children, count }: { children: ReactNode; count: number }) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [index, setIndex] = useState(0);

    const itemWidth = useCallback(() => {
        const first = trackRef.current?.firstElementChild as HTMLElement | null;

        return first ? first.offsetWidth + 8 : 260;
    }, []);

    const go = useCallback(
        (next: number) => {
            const clamped = Math.max(0, Math.min(count - 1, next));
            trackRef.current?.scrollTo({ left: clamped * itemWidth(), behavior: 'smooth' });
            setIndex(clamped);
        },
        [count, itemWidth],
    );

    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;

        const onScroll = () => setIndex(Math.max(0, Math.min(count - 1, Math.round(track.scrollLeft / itemWidth()))));
        track.addEventListener('scroll', onScroll, { passive: true });

        return () => track.removeEventListener('scroll', onScroll);
    }, [count, itemWidth]);

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'ArrowRight') go(index + 1);
        if (event.key === 'ArrowLeft') go(index - 1);
    };

    return (
        <div className="mk-carousel">
            <div ref={trackRef} className="mk-track" role="group" tabIndex={0} onKeyDown={onKeyDown}>
                {children}
            </div>
            <div className="mk-carousel-nav">
                <span className="mk-dots" role="status" aria-label={kt('item_position', { current: index + 1, total: count })}>
                    {Array.from({ length: count }, (_, dot) => (
                        <span key={dot} className="mk-dot" data-active={dot === index} />
                    ))}
                </span>
                <span className="mk-row" style={{ gap: 6 }}>
                    <button type="button" className="mk-nav" aria-label={kt('previous_item')} disabled={index === 0} onClick={() => go(index - 1)}>
                        <ChevronLeft size={16} />
                    </button>
                    <button type="button" className="mk-nav" aria-label={kt('next_item')} disabled={index >= count - 1} onClick={() => go(index + 1)}>
                        <ChevronRight size={16} />
                    </button>
                </span>
            </div>
        </div>
    );
}
