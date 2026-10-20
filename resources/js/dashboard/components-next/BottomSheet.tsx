import { Dialog } from '@base-ui/react/dialog';
import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { ReactNode } from 'react';

// Vỏ lớp phủ của điện thoại: bảng trượt lên từ mép dưới, ngón cái với tới được.
// Cùng nội dung với popover máy tính (menu trạng thái, người phụ trách, bảng Lọc);
// chỉ vỏ khác. Esc hoặc chạm nền mờ đều đóng; `title` là tên của hộp thoại cho trình đọc màn hình.
interface BottomSheetProps {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
    contentClassName?: string;
    // Nội dung có ô nhập: focus vào chính bảng thay vì ô đầu tiên để bàn phím không bật lên che bảng.
    focusesSheetOnOpen?: boolean;
    // Có thì bảng kéo lên được: kéo quá ngưỡng là gọi hàm này (vd. mở toàn màn).
    onSwipeUp?: () => void;
}

const SWIPE_UP_THRESHOLD = 48;
const DRAG_START_DISTANCE = 6;
const DRAG_RESISTANCE = 0.4;
const MAX_DRAG_OFFSET = 40;

export default function BottomSheet({ isOpen, title, onClose, children, contentClassName = '', focusesSheetOnOpen = false, onSwipeUp }: BottomSheetProps) {
    const popupRef = useRef<HTMLDivElement>(null);
    const dragStartY = useRef<number | null>(null);
    const [dragOffset, setDragOffset] = useState(0);

    const swipeHandlers = onSwipeUp
        ? {
              onPointerDown: (event: PointerEvent) => {
                  dragStartY.current = event.clientY;
              },
              onPointerMoveCapture: (event: PointerEvent) => {
                  // Giữ sự kiện khi ngón tay/chuột kéo ra khỏi mép trên của bảng.
                  if (dragStartY.current !== null && !event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.setPointerCapture(event.pointerId);
                  }
              },
              onPointerMove: (event: PointerEvent) => {
                  if (dragStartY.current === null) return;
                  const distance = event.clientY - dragStartY.current;
                  if (distance < -DRAG_START_DISTANCE) setDragOffset(Math.max(distance * DRAG_RESISTANCE, -MAX_DRAG_OFFSET));
              },
              onPointerUp: (event: PointerEvent) => {
                  const distance = dragStartY.current === null ? 0 : event.clientY - dragStartY.current;
                  dragStartY.current = null;
                  setDragOffset(0);
                  if (distance < -SWIPE_UP_THRESHOLD) onSwipeUp();
              },
              onPointerCancel: () => {
                  dragStartY.current = null;
                  setDragOffset(0);
              },
          }
        : {};

    return (
        <Dialog.Root
            open={isOpen}
            onOpenChange={open => {
                if (!open) onClose();
            }}
        >
            <Dialog.Portal>
                <Dialog.Backdrop
                    data-bottom-sheet-backdrop
                    className="fixed inset-0 z-50 bg-n-alpha-black2 transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none"
                />
                <Dialog.Popup
                    ref={popupRef}
                    initialFocus={focusesSheetOnOpen ? popupRef : true}
                    data-bottom-sheet
                    {...swipeHandlers}
                    style={dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined}
                    className={`overlay-surface fixed inset-x-0 bottom-0 z-50 flex flex-col max-h-[85dvh] rounded-t-xl pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] outline-none transition-[transform,opacity] duration-200 ease-out data-[starting-style]:translate-y-8 data-[starting-style]:opacity-0 data-[ending-style]:translate-y-8 data-[ending-style]:opacity-0 motion-reduce:transition-none ${onSwipeUp ? 'touch-none' : ''}`}
                >
                    <span className="mx-auto mb-2 h-1 w-9 shrink-0 rounded-full bg-n-slate-6" aria-hidden="true" />
                    <Dialog.Title className="m-0 px-4 pb-1 text-xs font-medium uppercase tracking-wide text-n-slate-11">
                        {title}
                    </Dialog.Title>
                    <div className={`flex flex-col min-h-0 overflow-y-auto ${contentClassName}`}>{children}</div>
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
