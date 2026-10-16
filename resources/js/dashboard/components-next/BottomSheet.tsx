import { Dialog } from '@base-ui/react/dialog';
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
}

export default function BottomSheet({ isOpen, title, onClose, children, contentClassName = '' }: BottomSheetProps) {
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
                    data-bottom-sheet
                    className="overlay-surface fixed inset-x-0 bottom-0 z-50 flex flex-col max-h-[85dvh] rounded-t-xl pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] outline-none transition-[transform,opacity] duration-200 ease-out data-[starting-style]:translate-y-8 data-[starting-style]:opacity-0 data-[ending-style]:translate-y-8 data-[ending-style]:opacity-0 motion-reduce:transition-none"
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
