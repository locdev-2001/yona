import type { ReactNode } from 'react';

import FluentIcon from 'shared/components/FluentIcon/FluentIcon';

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
        <div className="text-sm">
            <button
                type="button"
                className={`flex items-center select-none w-full rounded-lg bg-n-slate-2 outline outline-1 outline-n-weak m-0 cursor-grab justify-between py-2 px-4 drag-handle ${
                    isOpen ? 'rounded-bl-none rounded-br-none' : ''
                }`}
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
                        <FluentIcon size="24" icon={isOpen ? 'subtract' : 'add'} type="solid" />
                    </div>
                </div>
            </button>
            {isOpen ? (
                <div
                    className={`outline outline-1 outline-n-weak -mt-[-1px] border-t-0 rounded-br-lg rounded-bl-lg ${
                        compact ? 'p-0' : 'px-2 py-4'
                    }`}
                >
                    {children}
                </div>
            ) : null}
        </div>
    );
}
