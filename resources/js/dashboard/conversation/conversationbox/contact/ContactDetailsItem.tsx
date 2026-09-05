import type { ReactNode } from 'react';

// Port từ routes/dashboard/conversation/ContactDetailsItem.vue
interface ContactDetailsItemProps {
    title: string;
    value?: string | number;
    compact?: boolean;
    button?: ReactNode;
    children?: ReactNode;
}

export default function ContactDetailsItem({
    title,
    value = '',
    compact = false,
    button,
    children,
}: ContactDetailsItemProps) {
    return (
        <div className={`overflow-auto ${compact ? 'py-0 px-0' : 'py-3 px-4'}`}>
            <div className="items-center flex justify-between mb-1.5">
                <span className="text-sm font-medium text-n-slate-12">{title}</span>
                {button}
            </div>
            {value ? <div className="break-words">{children ?? value}</div> : null}
        </div>
    );
}
