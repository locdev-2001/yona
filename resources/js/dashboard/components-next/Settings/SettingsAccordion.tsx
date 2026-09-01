import { useState } from 'react';
import type { ReactNode } from 'react';

// Port từ dashboard/components-next/Settings/SettingsAccordion.vue
interface SettingsAccordionProps {
    title: string;
    defaultOpen?: boolean;
    className?: string;
    children: ReactNode;
}

export default function SettingsAccordion({
    title,
    defaultOpen = true,
    className = '',
    children,
}: SettingsAccordionProps) {
    const [isOpen, setOpen] = useState(defaultOpen);

    return (
        <>
            <div
                className={`flex items-center justify-between w-full cursor-pointer pb-2 pt-4 border-t border-n-weak ${className}`}
                onClick={() => setOpen(open => !open)}
            >
                <span className="text-heading-2 text-n-slate-12 w-full">{title}</span>
            </div>
            {isOpen ? <div className="w-full space-y-4 pt-4 mb-4">{children}</div> : null}
        </>
    );
}
