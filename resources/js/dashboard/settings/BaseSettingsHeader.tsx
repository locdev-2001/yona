import type { ReactNode } from 'react';

// Port từ dashboard/routes/dashboard/settings/components/BaseSettingsHeader.vue
// (phần profile dùng: title + description; back button / help link / search /
// tabs vào cùng các màn settings dùng chúng ở nhóm sau).
interface BaseSettingsHeaderProps {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
}

export default function BaseSettingsHeader({ title, description = '', actions }: BaseSettingsHeaderProps) {
    return (
        <>
            <div className="flex flex-col items-start w-full">
                {title ? (
                    <div className="flex items-center justify-between w-full gap-4 min-h-8 mb-2">
                        <h1 className="text-heading-1 text-n-slate-12">{title}</h1>
                    </div>
                ) : null}
                {description ? (
                    <div className="flex flex-col w-full gap-1.5 text-n-slate-11">
                        <p className="mb-0 line-clamp-5 sm:line-clamp-none max-w-3xl text-body-main">{description}</p>
                    </div>
                ) : null}
            </div>
            {actions ? (
                <div className="gap-3 flex flex-wrap sm:flex-nowrap justify-between sm:mt-4 min-w-0">
                    <div className="flex items-center gap-3 shrink-0 flex-row-reverse sm:flex-row">{actions}</div>
                </div>
            ) : null}
        </>
    );
}
