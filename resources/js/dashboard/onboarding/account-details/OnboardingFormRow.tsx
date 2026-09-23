import type { ReactNode } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';

// Port từ dashboard/routes/dashboard/onboarding/account-details/OnboardingFormRow.vue
// (+ dòng gợi ý dưới nhãn, vd "Không bắt buộc").
interface OnboardingFormRowProps {
    title: string;
    icon: string;
    hint?: string;
    children: ReactNode;
}

export default function OnboardingFormRow({ title, icon, hint, children }: OnboardingFormRowProps) {
    return (
        <div className="grid grid-cols-2 items-center px-3 py-3 border-t border-n-weak">
            <div className="flex items-center gap-2">
                <Icon icon={icon} className="size-4 text-n-slate-9 flex-shrink-0" />
                <span className="text-n-slate-11">{title}</span>
                {hint ? <span className="text-xs text-n-slate-10">· {hint}</span> : null}
            </div>
            {children}
        </div>
    );
}
