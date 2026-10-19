import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import Icon from 'dashboard/components-next/icon/Icon';
import {
    AUTO_SCROLL_STEP_PX,
    autoScrollDirection,
    nearestScrollParent,
    passedDragThreshold,
    verticalInsertBefore,
} from 'shared/reorder/reorderGeometry';

// Port từ components-next/DraggableReorderList/DraggableReorderList.vue.
// Danh sách kéo thả có lật trang khi giữ ở mép; phải giữ nguyên khi đang tải
// trang mới, nếu ẩn danh sách thì mất phần tử đang cầm.
const EDGE_BAND = 72; // px tính từ mép để nạp lệnh lật trang
const AUTO_PAGE_DELAY = 600; // ms giữ ở mép trước khi lật
const PILL = 36; // px, nút mũi tên lật trang ở mép
const EDGE_BAND_W = 80; // px bề rộng dải sáng ở mỗi mép lật được

interface ReorderItem {
    id: number | string;
    position?: number;
}

interface DraggableReorderListProps<T extends ReorderItem> {
    items: T[];
    disabled?: boolean;
    className?: string;
    currentPage?: number;
    totalPages?: number;
    renderItem: (item: T, index: number) => ReactNode;
    renderGhost: (item: T) => ReactNode;
    onReorder: (positions: Record<string, number>) => void;
    onNavigatePage?: (page: number) => void;
    onDragging?: (isDragging: boolean) => void;
}

interface PressState<T> {
    item: T;
    x: number;
    y: number;
    dx: number;
    dy: number;
    h: number;
}

export default function DraggableReorderList<T extends ReorderItem>({
    items,
    disabled = false,
    className = '',
    currentPage = 1,
    totalPages = 1,
    renderItem,
    renderGhost,
    onReorder,
    onNavigatePage,
    onDragging,
}: DraggableReorderListProps<T>) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [isDragging, setDragging] = useState(false);
    const [dragged, setDragged] = useState<T | null>(null);
    const [pointer, setPointer] = useState({ x: 0, y: 0 });
    const [insertBefore, setInsertBefore] = useState<string | null>(null);
    const [activeEdge, setActiveEdge] = useState<string | null>(null);
    const [bounds, setBounds] = useState({ left: 0, right: 0, top: 0, bottom: 0 });
    const [grab, setGrab] = useState({ dx: 0, dy: 0 });
    const [dragHeight, setDragHeight] = useState(0);

    const pressRef = useRef<PressState<T> | null>(null);
    const dwellRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const pagingRef = useRef(false);
    const scrollerRef = useRef<HTMLElement | null>(null);
    const scrollDirRef = useRef(0);
    const sourcePageRef = useRef(1);
    const rafRef = useRef<number | undefined>(undefined);

    const stateRef = useRef({ items, currentPage, totalPages, dragged, insertBefore, isDragging, pointer });
    stateRef.current = { items, currentPage, totalPages, dragged, insertBefore, isDragging, pointer };

    const keyOf = (item?: T | null) => String(item?.id);
    const others = useCallback(
        (item: T) => stateRef.current.items.filter(other => keyOf(other) !== keyOf(item)),
        [],
    );
    const isRTL = () => document.querySelector('#app[dir]')?.getAttribute('dir') === 'rtl';
    const canPage = useCallback(
        (direction: string) =>
            direction === 'next'
                ? stateRef.current.currentPage < stateRef.current.totalPages
                : stateRef.current.currentPage > 1,
        [],
    );

    // Khoá của phần tử đứng ngay sau `key`, null khi nó là phần tử cuối.
    const keyAfter = (list: T[], key: string): string | null => {
        const next = list[list.findIndex(other => keyOf(other) === key) + 1];

        return next ? keyOf(next) : null;
    };

    const edges = ['prev', 'next'].filter(canPage).map(direction => {
        const onLeft = isRTL() ? direction === 'next' : direction === 'prev';

        return { dir: direction, onLeft, icon: onLeft ? 'i-lucide-chevrons-left' : 'i-lucide-chevrons-right' };
    });

    // Danh sách khi đang kéo: phần tử đang cầm nằm ở khe `insertBefore`.
    const displayItems = (() => {
        if (!isDragging || !dragged) return items;

        const rest = others(dragged);
        const at = rest.findIndex(other => keyOf(other) === insertBefore);
        rest.splice(at === -1 ? rest.length : at, 0, dragged);

        return rest;
    })();

    // Dời khe khi con trỏ vượt qua giữa thẻ đang lơ lửng bên trên.
    const aim = useCallback(() => {
        const { pointer: point, dragged: current } = stateRef.current;
        if (!current) return;

        const card = document.elementFromPoint(point.x, point.y)?.closest('[data-drag-id]') as HTMLElement | null;
        const key = card?.dataset.dragId;
        if (!key || key === keyOf(current)) return;

        setInsertBefore(
            verticalInsertBefore(point.y, { key, rect: card!.getBoundingClientRect() }, others(current).map(keyOf)),
        );
    }, [others]);

    const flip = useCallback(
        (direction: string) => {
            if (pagingRef.current || !stateRef.current.isDragging) return;
            pagingRef.current = true;
            onNavigatePage?.(stateRef.current.currentPage + (direction === 'next' ? 1 : -1));
        },
        [onNavigatePage],
    );

    const aimEdge = useCallback(
        (x: number) => {
            const rect = rootRef.current?.getBoundingClientRect();
            if (!rect) return;

            const view = scrollerRef.current?.getBoundingClientRect();
            const viewTop = Math.max(view?.top ?? 0, 0);
            const viewBottom = Math.min(view?.bottom ?? window.innerHeight, window.innerHeight);
            setBounds({
                left: rect.left,
                right: rect.right,
                top: Math.max(rect.top, viewTop),
                bottom: Math.min(rect.bottom, viewBottom),
            });

            let direction: string | null = null;
            if (x <= rect.left + EDGE_BAND) direction = isRTL() ? 'next' : 'prev';
            else if (x >= rect.right - EDGE_BAND) direction = isRTL() ? 'prev' : 'next';
            if (direction && !canPage(direction)) direction = null;

            setActiveEdge(previous => {
                if (direction === previous) return previous;

                clearTimeout(dwellRef.current);
                if (direction) dwellRef.current = setTimeout(() => flip(direction), AUTO_PAGE_DELAY);

                return direction;
            });
        },
        [canPage, flip],
    );

    // Tổ tiên cuộn được gần nhất, để kéo tới hàng nằm ngoài màn hình.
    const scrollParent = (): HTMLElement | null => nearestScrollParent(rootRef.current);

    const stopAutoScroll = () => {
        if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
    };

    const autoScrollFrame = useCallback(() => {
        const scroller = scrollerRef.current;
        if (!scroller || !scrollDirRef.current) {
            rafRef.current = undefined;

            return;
        }
        scroller.scrollTop += scrollDirRef.current * AUTO_SCROLL_STEP_PX;
        aim();
        aimEdge(stateRef.current.pointer.x);
        rafRef.current = requestAnimationFrame(autoScrollFrame);
    }, [aim, aimEdge]);

    const updateAutoScroll = useCallback(
        (y: number) => {
            const scroller = scrollerRef.current;
            if (!scroller) return;

            scrollDirRef.current = autoScrollDirection(scroller, y);

            if (scrollDirRef.current && rafRef.current === undefined) {
                rafRef.current = requestAnimationFrame(autoScrollFrame);
            } else if (!scrollDirRef.current) {
                stopAutoScroll();
            }
        },
        [autoScrollFrame],
    );

    const reset = useCallback(() => {
        setDragging(false);
        setDragged(null);
        setInsertBefore(null);
        setActiveEdge(null);
        clearTimeout(dwellRef.current);
        pagingRef.current = false;
        scrollDirRef.current = 0;
        scrollerRef.current = null;
        stopAutoScroll();
        document.body.classList.remove('select-none');
        onDragging?.(false);
    }, [onDragging]);

    // Vị trí nằm trên lưới bước 10; điểm giữa (±5 ở hai đầu) chèn giữa hai hàng.
    // Ca khó là thả ở đầu/cuối khi vừa lật trang: bỏ phần tử khỏi trang nguồn
    // kéo hàng biên của trang đích lấp vào chỗ trống, nên phải đáp giữa hai hàng
    // biên, nếu không phần tử nhảy sang trang bên cạnh và biến mất khỏi tầm nhìn.
    const drop = useCallback(
        (item: T, rawBefore: string | null) => {
            const pos = (record?: T) => record?.position || 0;
            const mid = (a?: T, b?: T) => Math.floor((pos(a) + pos(b)) / 2);
            const rest = others(item);
            if (!rest.length) return;

            const before = rest.some(other => keyOf(other) === rawBefore) ? rawBefore : null;
            const movedDown = stateRef.current.currentPage > sourcePageRef.current;
            const movedUp = stateRef.current.currentPage < sourcePageRef.current;

            let position: number;
            if (before === null) {
                position =
                    movedUp && rest.length >= 2 ? mid(rest.at(-2), rest.at(-1)) : pos(rest.at(-1)) + 5;
            } else {
                const index = rest.findIndex(other => keyOf(other) === before);
                if (index > 0) {
                    position = mid(rest[index - 1], rest[index]);
                } else if (movedDown) {
                    position = rest.length >= 2 ? mid(rest[0], rest[1]) : pos(rest[0]) + 5;
                } else {
                    position = pos(rest[0]) - 5;
                }
            }

            onReorder({ [String(item.id)]: position });
        },
        [onReorder, others],
    );

    const onPointerDown = (item: T, event: React.PointerEvent<HTMLLIElement>) => {
        if (event.button !== 0 || disabled) return;
        if ((event.target as HTMLElement).closest('button, a, input, [role="button"]')) return;

        const rect = event.currentTarget.getBoundingClientRect();
        pressRef.current = {
            item,
            x: event.clientX,
            y: event.clientY,
            dx: event.clientX - rect.left,
            dy: event.clientY - rect.top,
            h: rect.height,
        };
    };

    useEffect(() => {
        const onPointerMove = (event: PointerEvent) => {
            const press = pressRef.current;
            if (!press) return;

            if (!stateRef.current.isDragging) {
                if (!passedDragThreshold(press, { x: event.clientX, y: event.clientY })) return;

                setDragging(true);
                setDragged(press.item);
                setGrab({ dx: press.dx, dy: press.dy });
                setDragHeight(press.h);
                setInsertBefore(keyAfter(stateRef.current.items, keyOf(press.item)));
                sourcePageRef.current = stateRef.current.currentPage;
                scrollerRef.current = scrollParent();
                document.body.classList.add('select-none');
                onDragging?.(true);
                stateRef.current.isDragging = true;
                stateRef.current.dragged = press.item;
            }

            event.preventDefault();
            setPointer({ x: event.clientX, y: event.clientY });
            stateRef.current.pointer = { x: event.clientX, y: event.clientY };
            aim();
            aimEdge(event.clientX);
            updateAutoScroll(event.clientY);
        };

        const onPointerUp = () => {
            const press = pressRef.current;
            if (!press) return;
            pressRef.current = null;
            if (!stateRef.current.isDragging) return;

            const item = stateRef.current.dragged;
            const before = stateRef.current.insertBefore;
            const flipping = pagingRef.current;
            reset();
            if (!flipping && item) drop(item, before);
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || !stateRef.current.isDragging) return;
            pressRef.current = null;
            reset();
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('keydown', onKeyDown);
            clearTimeout(dwellRef.current);
            stopAutoScroll();
            document.body.classList.remove('select-none');
        };
    }, [aim, aimEdge, drop, onDragging, reset, updateAutoScroll]);

    // Trang mới về: ngắm lại dưới con trỏ đang giữ để mép vẫn tiếp tục lật.
    useEffect(() => {
        if (!isDragging || !pagingRef.current) return;
        pagingRef.current = false;
        aim();
        setActiveEdge(null);
        aimEdge(pointer.x);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    const bandStyle = (onLeft: boolean) => ({
        width: `${EDGE_BAND_W}px`,
        height: `${bounds.bottom - bounds.top}px`,
        transform: `translate(${onLeft ? bounds.left : bounds.right - EDGE_BAND_W}px, ${bounds.top}px)`,
    });

    const pillStyle = (onLeft: boolean) => ({
        transform: `translate(${onLeft ? bounds.left + 12 : bounds.right - PILL - 12}px, ${pointer.y - PILL / 2}px)`,
    });

    return (
        <div ref={rootRef} className={`relative w-full h-full ${className}`.trim()}>
            <ul className="w-full h-full space-y-4">
                {displayItems.map((item, index) => (
                    <li
                        key={keyOf(item)}
                        data-drag-id={keyOf(item)}
                        className={`relative list-none ${!disabled && !isDragging ? 'cursor-grab' : ''}`.trim()}
                        onPointerDown={event => onPointerDown(item, event)}
                        onDragStart={event => event.preventDefault()}
                    >
                        {isDragging && keyOf(item) === keyOf(dragged) ? (
                            <div
                                style={{ height: `${dragHeight}px` }}
                                className="border-2 border-dashed rounded-2xl border-n-brand/50 bg-n-brand/5"
                            />
                        ) : (
                            renderItem(item, index)
                        )}
                    </li>
                ))}
            </ul>

            {isDragging
                ? createPortal(
                      <>
                          {edges.map(edge => (
                              <div
                                  key={`band-${edge.dir}`}
                                  style={bandStyle(edge.onLeft)}
                                  className={`fixed top-0 left-0 z-40 pointer-events-none from-n-brand/15 to-transparent transition-opacity duration-200 [mask-image:linear-gradient(to_bottom,transparent,#000_56px,#000_calc(100%_-_56px),transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,#000_56px,#000_calc(100%_-_56px),transparent)] ${
                                      edge.onLeft ? 'bg-gradient-to-r' : 'bg-gradient-to-l'
                                  } ${activeEdge === edge.dir ? 'opacity-100' : 'opacity-0'}`}
                              />
                          ))}
                          {edges.map(edge => (
                              <div
                                  key={edge.dir}
                                  style={pillStyle(edge.onLeft)}
                                  className={`fixed top-0 left-0 z-50 flex items-center justify-center transition-all duration-150 border rounded-full pointer-events-none size-9 backdrop-blur-sm ${
                                      activeEdge === edge.dir
                                          ? 'scale-110 border-n-brand bg-n-brand/20 text-n-brand shadow-md'
                                          : 'opacity-70 border-n-weak/60 bg-n-solid-1/70 text-n-slate-10'
                                  }`}
                              >
                                  <Icon
                                      icon={edge.icon}
                                      className={`size-4 ${activeEdge === edge.dir ? 'animate-pulse' : ''}`.trim()}
                                  />
                              </div>
                          ))}
                          {dragged ? (
                              <div
                                  style={{
                                      width: `${bounds.right - bounds.left}px`,
                                      transform: `translate(${pointer.x - grab.dx}px, ${pointer.y - grab.dy}px)`,
                                  }}
                                  className="fixed top-0 left-0 z-50 pointer-events-none select-none"
                              >
                                  <div
                                      style={{ transformOrigin: `${grab.dx}px ${grab.dy}px` }}
                                      className={`transition-transform duration-150 shadow-2xl rounded-2xl ${activeEdge ? 'scale-50' : ''}`.trim()}
                                  >
                                      {renderGhost(dragged)}
                                  </div>
                              </div>
                          ) : null}
                      </>,
                      document.body,
                  )
                : null}
        </div>
    );
}
