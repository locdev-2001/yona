import type { ReactNode } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';

// Port từ dashboard/routes/dashboard/onboarding/account-details/OnboardingFormRow.vue
interface OnboardingFormRowProps {
    title: string;
    icon: string;
    children: ReactNode;
}

export default function OnboardingFormRow({ title, icon, children }: OnboardingFormRowProps) {
    return (
        <div className="grid grid-cols-2 items-center px-3 py-3 border-t border-n-weak">
            <div className="flex items-center gap-2">
                <Icon icon={icon} className="size-4 text-n-slate-9 flex-shrink-0" />
                <span className="text-n-slate-11">{title}</span>
            </div>
            {children}
        </div>
    );
}
