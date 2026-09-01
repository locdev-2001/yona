import type { ReactNode } from 'react';

// Port từ dashboard/components-next/Settings/SettingsFieldSection.vue
interface SettingsFieldSectionProps {
    label: string;
    helpText?: string;
    className?: string;
    children?: ReactNode;
    extra?: ReactNode;
}

export default function SettingsFieldSection({
    label,
    helpText = '',
    className = '',
    children,
    extra,
}: SettingsFieldSectionProps) {
    return (
        <div className={`w-full py-2 mb-2 [interpolate-size:allow-keywords] ${className}`}>
            <div className="grid grid-cols-1 lg:grid-cols-8 gap-1.5 lg:gap-4 items-start lg:items-center">
                <label className="text-heading-3 text-n-slate-12 col-span-1 lg:col-span-2">{label}</label>
                <div className="col-span-1 lg:col-span-6">{children}</div>
            </div>
            {helpText ? (
                <div className="grid grid-cols-1 lg:grid-cols-8">
                    <div className="col-span-1 lg:col-span-2 invisible" />
                    <p className="mt-1.5 col-span-1 lg:col-span-6 text-label-small text-n-slate-11 ltr:ml-1 rtl:mr-1">
                        {helpText}
                    </p>
                </div>
            ) : null}
            {extra}
        </div>
    );
}
