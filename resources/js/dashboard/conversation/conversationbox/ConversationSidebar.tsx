import { useEffect, useRef } from 'react';

import { SMALL_SCREEN_BREAKPOINT } from 'dashboard/constants/globals';
import { useConversation } from '../ConversationContext';
import { useContactPanelOpen } from '../contactPanelVisibility';
import ContactPanel from './ContactPanel';

// Port từ widgets/conversation/ConversationSidebar.vue — cột phải 320/360px
// (md+) hoặc drawer full-height trên màn nhỏ; click ngoài trên màn nhỏ thì đóng.
export default function ConversationSidebar() {
    const { uiSettings, updateUISettings } = useConversation();
    const rootRef = useRef<HTMLDivElement>(null);
    const isContactSidebarOpen = useContactPanelOpen(uiSettings);
    const activeTab = isContactSidebarOpen ? 0 : null;

    useEffect(() => {
        const onMouseDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (rootRef.current?.contains(target)) return;
            if (target.closest('dialog.ProseMirror-prompt-backdrop, [data-popover-content], [data-popover-backdrop]')) return;
            if (window.innerWidth < SMALL_SCREEN_BREAKPOINT && isContactSidebarOpen) {
                updateUISettings({ is_contact_sidebar_open: false, is_copilot_panel_open: false });
            }
        };
        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [isContactSidebarOpen, updateUISettings]);

    return (
        <div
            ref={rootRef}
            className={`bg-n-surface-2 h-full overflow-hidden flex flex-col fixed top-0 z-40 w-full max-w-sm transition-transform duration-300 ease-in-out ltr:right-0 rtl:left-0 md:static md:w-[320px] md:min-w-[320px] ltr:border-l rtl:border-r border-n-weak 2xl:min-w-[360px] 2xl:w-[360px] shadow-lg md:shadow-none ${
                activeTab === 0 ? 'md:flex' : 'md:hidden'
            }`}
        >
            <div className="flex flex-1 overflow-auto">{activeTab === 0 ? <ContactPanel /> : null}</div>
        </div>
    );
}
