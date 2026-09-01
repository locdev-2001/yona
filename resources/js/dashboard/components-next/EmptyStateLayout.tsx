import type { ReactNode } from 'react';

// Port từ dashboard/components-next/EmptyStateLayout.vue
// (Policy actionPerms: caller tự lọc quyền trước khi truyền actions).
interface EmptyStateLayoutProps {
    title: string;
    subtitle?: string;
    showBackdrop?: boolean;
    emptyStateItem?: ReactNode;
    actions?: ReactNode;
}

export default function EmptyStateLayout({
    title,
    subtitle = '',
    showBackdrop = true,
    emptyStateItem,
    actions,
}: EmptyStateLayoutProps) {
    return (
        <section className="relative flex flex-col items-center justify-center w-full h-full overflow-hidden">
            <div className="relative w-full max-w-5xl mx-auto overflow-hidden h-full max-h-[28rem]">
                {showBackdrop ? (
                    <div className="w-full h-full space-y-4 overflow-y-hidden opacity-50 pointer-events-none">
                        {emptyStateItem}
                    </div>
                ) : null}
                <div
                    className={`flex flex-col items-center justify-end w-full h-full pb-20 ${
                        showBackdrop
                            ? 'absolute inset-x-0 bottom-0 bg-gradient-to-t from-n-surface-1 from-25% to-transparent'
                            : ''
                    }`.trim()}
                >
                    <div className={`flex flex-col items-center justify-center gap-6 ${showBackdrop ? '' : 'mt-48'}`.trim()}>
                        <div className="flex flex-col items-center justify-center gap-3">
                            <h2 className="text-3xl font-medium text-center text-n-slate-12">{title}</h2>
                            {subtitle ? (
                                <p className="max-w-xl text-base text-center text-n-slate-11 tracking-[0.3px]">
                                    {subtitle}
                                </p>
                            ) : null}
                        </div>
                        {actions}
                    </div>
                </div>
            </div>
        </section>
    );
}
