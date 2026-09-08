import { useEffect, useRef } from 'react';

import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';
import { useContactPanelControl, useIsContactPanelOverlay } from '../contactPanelVisibility';
import ContactPanel from './ContactPanel';

// Port từ widgets/conversation/ConversationSidebar.vue — cột phải 320/360px
// (xl+) hoặc lớp phủ full-height khi chưa đủ chỗ; chạm/bấm ra ngoài lớp phủ thì
// đóng. Lớp phủ phải nhận cả `touchstart` vì thiết bị cảm ứng không phát
// `mousedown` trước khi cuộn. Ngưỡng cột tĩnh nâng từ `md` lên `xl` cùng lượt
// với LARGE_SCREEN_BREAKPOINT: ở 1024–1279 ba cột làm khung chat còn ~1px.
export default function ConversationSidebar() {
    const { uiSettings, updateUISettings } = useConversation();
    const rootRef = useRef<HTMLDivElement>(null);
    const isOverlay = useIsContactPanelOverlay();
    const { isOpen, setOpen } = useContactPanelControl(uiSettings, updateUISettings);

    useEffect(() => {
        if (!isOverlay || !isOpen) return undefined;

        const onPointerDown = (event: Event) => {
            const target = event.target as HTMLElement | null;
            if (!target || rootRef.current?.contains(target)) return;
            if (target.closest('dialog.ProseMirror-prompt-backdrop, [data-popover-content], [data-popover-backdrop]')) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('touchstart', onPointerDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('touchstart', onPointerDown);
        };
    }, [isOverlay, isOpen, setOpen]);

    return (
        <>
            {isOverlay && isOpen ? (
                // Lớp phủ chiếm gần hết bề rộng máy 390px: không còn dải trống
                // nào để "bấm ra ngoài", nên phải có nền mờ bấm được ở dưới nó.
                <button
                    type="button"
                    aria-label={t('CONVERSATION.SIDEBAR.CLOSE_OVERLAY')}
                    // z-40 để nằm TRÊN thanh điều hướng trái (`Sidebar.tsx` z-40):
                    // ở 820px thanh đó là cột tĩnh, nền mờ z-30 chui xuống dưới nên
                    // dải 0–272px không mờ và bấm vào đó không đóng được panel.
                    className="fixed inset-0 z-40 bg-n-slate-12/30 backdrop-blur-[1px] xl:hidden"
                    onClick={() => setOpen(false)}
                />
            ) : null}
            <div
                ref={rootRef}
                data-testid="conversation-sidebar"
                className={`bg-n-surface-2 h-full overflow-hidden flex flex-col fixed top-0 z-50 w-full max-w-sm transition-transform duration-300 ease-in-out ltr:right-0 rtl:left-0 xl:static xl:w-[320px] xl:min-w-[320px] ltr:border-l rtl:border-r border-n-weak 2xl:min-w-[360px] 2xl:w-[360px] shadow-lg xl:shadow-none ${
                    isOpen ? 'xl:flex' : 'xl:hidden'
                }`}
            >
                <div className="flex flex-1 overflow-auto">{isOpen ? <ContactPanel /> : null}</div>
            </div>
        </>
    );
}
