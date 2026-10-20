import { useEffect, useRef, useState } from 'react';

import { isGroupStageOpen, useCallSession } from 'dashboard/calls/callSession';
import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';
import { useContactPanelControl, useIsContactPanelOverlay } from '../contactPanelVisibility';
import ContactPanel from './ContactPanel';

export const CONTACT_PANEL_SLIDE_MS = 300;

const SLIDE_TRANSITION = 'duration-300 ease-in-out motion-reduce:transition-none';

// Port từ widgets/conversation/ConversationSidebar.vue — cột phải 320/360px
// (xl+) hoặc lớp phủ full-height khi chưa đủ chỗ; chạm/bấm ra ngoài lớp phủ thì
// đóng. Lớp phủ phải nhận cả `touchstart` vì thiết bị cảm ứng không phát
// `mousedown` trước khi cuộn. Ngưỡng cột tĩnh nâng từ `md` lên `xl` cùng lượt
// với LARGE_SCREEN_BREAKPOINT: ở 1024–1279 ba cột làm khung chat còn ~1px.
//
// Bật/tắt bằng nút ở thanh tiêu đề hội thoại; panel trượt ra/vào thay vì hiện
// tắt đột ngột: cột tĩnh co giãn bề rộng (nội dung giữ bề rộng cố định nên trông
// như trượt khỏi mép phải), lớp phủ trượt bằng translate. Nội dung còn dựng tới
// khi trượt xong để không biến mất giữa chừng.
export default function ConversationSidebar() {
    const { uiSettings, updateUISettings } = useConversation();
    const rootRef = useRef<HTMLDivElement>(null);
    const isOverlay = useIsContactPanelOverlay();
    const { isOpen: isPanelOpen, setOpen } = useContactPanelControl(uiSettings, updateUISettings);
    // Lớp phủ nằm trên mọi thứ trong khung làm việc: khi màn phòng thoại mở thì nhường chỗ (không
    // lưu là đã đóng), để thanh điều khiển phòng không bị che; về lại chat thì panel hiện như cũ.
    const isCoveredByCallStage = isGroupStageOpen(useCallSession());
    const isOpen = isPanelOpen && !(isOverlay && isCoveredByCallStage);
    const [isContentMounted, setIsContentMounted] = useState(isOpen);

    useEffect(() => {
        if (isOpen) {
            setIsContentMounted(true);
            return undefined;
        }
        const timer = window.setTimeout(() => setIsContentMounted(false), CONTACT_PANEL_SLIDE_MS);
        return () => window.clearTimeout(timer);
    }, [isOpen]);

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

    const frameClass = isOverlay
        ? `fixed top-0 z-50 w-full max-w-sm ltr:right-0 rtl:left-0 shadow-overlay transition-transform ${SLIDE_TRANSITION} ${
              isOpen ? 'translate-x-0' : 'ltr:translate-x-full rtl:-translate-x-full'
          }`
        : `relative shrink-0 transition-[width] ${SLIDE_TRANSITION} ${
              isOpen ? 'w-[320px] 2xl:w-[360px]' : 'w-0'
          }`;

    return (
        <>
            {isOverlay ? (
                // Lớp phủ chiếm gần hết bề rộng máy 390px: không còn dải trống
                // nào để "bấm ra ngoài", nên phải có nền mờ bấm được ở dưới nó.
                <button
                    type="button"
                    aria-label={t('CONVERSATION.SIDEBAR.CLOSE_OVERLAY')}
                    tabIndex={isOpen ? 0 : -1}
                    aria-hidden={!isOpen}
                    // z-40 để nằm TRÊN thanh điều hướng trái (`Sidebar.tsx` z-40):
                    // ở 820px thanh đó là cột tĩnh, nền mờ z-30 chui xuống dưới nên
                    // dải 0–272px không mờ và bấm vào đó không đóng được panel.
                    className={`fixed inset-0 z-40 bg-n-slate-12/30 backdrop-blur-[1px] transition-opacity ${SLIDE_TRANSITION} ${
                        isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                    }`}
                    onClick={() => setOpen(false)}
                />
            ) : null}
            <div
                ref={rootRef}
                data-testid="conversation-sidebar"
                data-open={isOpen}
                inert={!isOpen}
                className={`bg-n-surface-panel h-full overflow-hidden flex flex-col ${frameClass}`}
            >
                <div className="flex flex-1 overflow-auto w-full xl:w-[320px] xl:min-w-[320px] 2xl:w-[360px] 2xl:min-w-[360px]">
                    {isContentMounted ? <ContactPanel /> : null}
                </div>
            </div>
        </>
    );
}
