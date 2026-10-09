import type { ReactNode } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';

// Port từ dashboard/routes/dashboard/onboarding/shared/OnboardingSection.vue
interface OnboardingSectionProps {
    title: string;
    icon: string;
    bare?: boolean;
    children: ReactNode;
}

export default function OnboardingSection({ title, icon, bare = false, children }: OnboardingSectionProps) {
    return (
        <div className="mb-5">
            <div className="flex items-center gap-4 mb-3 -ms-12">
                <div className="flex flex-col items-center z-10 flex-shrink-0">
                    <svg width="6" height="5" viewBox="0 0 6 5" fill="none" className="text-n-slate-5">
                        <path d="M3 0L6 5H0L3 0Z" fill="currentColor" />
                    </svg>
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg panel-surface">
                        <Icon icon={icon} className="size-4 text-n-slate-11" />
                    </div>
                    <svg width="6" height="5" viewBox="0 0 6 5" fill="none" className="text-n-slate-5">
                        <path d="M3 5L0 0H6L3 5Z" fill="currentColor" />
                    </svg>
                </div>
                <span className="text-heading-3 text-n-slate-12">{title}</span>
            </div>

            {bare ? (
                children
            ) : (
                <div className="panel-surface rounded-xl overflow-hidden">{children}</div>
            )}
        </div>
    );
}
