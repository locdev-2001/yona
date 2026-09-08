import { useEffect, useRef } from 'react';

import { useIsSmallScreen } from 'dashboard/composables/useViewportWidth';
import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';
import { useContactPanelControl } from '../contactPanelVisibility';
import ContactPanel from './ContactPanel';

// Port từ widgets/conversation/ConversationSidebar.vue — cột phải 320/360px
// (md+) hoặc lớp phủ full-height trên màn hẹp; chạm/bấm ra ngoài trên màn hẹp
// thì đóng. Trên màn hẹp lớp phủ phải nhận cả `touchstart` vì thiết bị cảm ứng
// không phát `mousedown` trước khi cuộn.
export default function ConversationSidebar() {
    const { uiSettings, updateUISettings } = useConversation();
    const rootRef = useRef<HTMLDivElement>(null);
    const isSmallScreen = useIsSmallScreen();
    const { isOpen, setOpen } = useContactPanelControl(uiSettings, updateUISettings);

    useEffect(() => {
        if (!isSmallScreen || !isOpen) return undefined;

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
    }, [isSmallScreen, isOpen, setOpen]);

    return (
        <>
            {isSmallScreen && isOpen ? (
                // Lớp phủ chiếm gần hết bề rộng máy 390px: không còn dải trống
                // nào để "bấm ra ngoài", nên phải có nền mờ bấm được ở dưới nó.
                <button
                    type="button"
                    aria-label={t('CONVERSATION.SIDEBAR.CLOSE_OVERLAY')}
                    className="fixed inset-0 z-30 bg-n-slate-12/30 backdrop-blur-[1px] md:hidden"
                    onClick={() => setOpen(false)}
                />
            ) : null}
            <div
                ref={rootRef}
                data-testid="conversation-sidebar"
                className={`bg-n-surface-2 h-full overflow-hidden flex flex-col fixed top-0 z-40 w-full max-w-sm transition-transform duration-300 ease-in-out ltr:right-0 rtl:left-0 md:static md:w-[320px] md:min-w-[320px] ltr:border-l rtl:border-r border-n-weak 2xl:min-w-[360px] 2xl:w-[360px] shadow-lg md:shadow-none ${
                    isOpen ? 'md:flex' : 'md:hidden'
                }`}
            >
                <div className="flex flex-1 overflow-auto">{isOpen ? <ContactPanel /> : null}</div>
            </div>
        </>
    );
}
