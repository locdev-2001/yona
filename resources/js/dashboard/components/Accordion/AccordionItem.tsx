import type { ReactNode } from 'react';

import { ICONS } from 'dashboard/icons';

// Port từ dashboard/components/Accordion/AccordionItem.vue (EmojiOrIcon với
// icon/emoji rỗng KHÔNG render gì → không chèn ô giữ chỗ; kéo thả sắp xếp =
// vuedraggable, chưa port).
interface AccordionItemProps {
    title: string;
    compact?: boolean;
    emoji?: string;
    isOpen?: boolean;
    onToggle: () => void;
    button?: ReactNode;
    children?: ReactNode;
}

export default function AccordionItem({
    title,
    compact = false,
    emoji = '',
    isOpen = true,
    onToggle,
    button,
    children,
}: AccordionItemProps) {
    return (
        <div className="text-sm rounded-lg bg-n-surface-canvas border border-n-weak">
            <button
                type="button"
                aria-expanded={isOpen}
                className="flex items-center select-none w-full rounded-lg bg-transparent hover:bg-n-surface-hover m-0 cursor-grab justify-between py-2 px-2 drag-handle"
                onClick={event => {
                    event.stopPropagation();
                    onToggle();
                }}
            >
                <div className="flex justify-between">
                    {emoji ? <i className="inline-block w-5 not-italic">{emoji}</i> : null}
                    <h5 className="text-n-slate-12 text-sm mb-0 py-0 pr-2 pl-0">{title}</h5>
                </div>
                <div className="flex flex-row">
                    {button}
                    <div className="flex justify-end w-3 text-n-blue-11 cursor-pointer">
                        <span className={`${isOpen ? ICONS.collapse : ICONS.expand} size-6`} aria-hidden="true" />
                    </div>
                </div>
            </button>
            {isOpen ? (
                <div className={compact ? 'p-0' : 'px-2 pt-1 pb-4'}>
                    {children}
                </div>
            ) : null}
        </div>
    );
}
