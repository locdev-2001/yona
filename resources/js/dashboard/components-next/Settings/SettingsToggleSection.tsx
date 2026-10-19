import type { ReactNode } from 'react';

import Switch from 'dashboard/components-next/switch/Switch';

// Port từ dashboard/components-next/Settings/SettingsToggleSection.vue
interface SettingsToggleSectionProps {
    header: string;
    description?: string;
    compact?: boolean;
    hideToggle?: boolean;
    value?: boolean;
    className?: string;
    onChange?: (value: boolean) => void;
    children?: ReactNode;
    editor?: ReactNode;
}

export default function SettingsToggleSection({
    header,
    description = '',
    compact = false,
    hideToggle = false,
    value = false,
    className = '',
    onChange,
    children,
    editor,
}: SettingsToggleSectionProps) {
    return (
        <div
            className={`flex flex-col items-start panel-surface rounded-xl [interpolate-size:allow-keywords] ${className}`}
        >
            <div className="flex flex-col gap-1 items-start w-full py-3">
                <div className="flex items-center gap-3 w-full justify-between px-4">
                    <span className="text-heading-3 text-n-slate-12">{header}</span>
                    {hideToggle ? (
                        <div className="size-2" />
                    ) : (
                        <Switch value={value} ariaLabel={header} onChange={next => onChange?.(next)} />
                    )}
                </div>
                {description ? <span className="text-body-main text-n-slate-11 px-4">{description}</span> : null}
                {children}
            </div>
            {editor ? (
                <div className={`w-full ${compact ? 'p-0' : 'px-4 pb-4 pt-2'}`}>
                    {editor}
                </div>
            ) : null}
        </div>
    );
}
