import type { ReactNode } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';

// Port từ components-next/integration-card/IntegrationCard.vue.
interface IntegrationCardProps {
    icon: string;
    title: string;
    description?: string;
    children?: ReactNode;
}

export default function IntegrationCard({ icon, title, description = '', children }: IntegrationCardProps) {
    return (
        <div className="flex flex-col gap-4 p-4 rounded-xl outline outline-1 outline-n-weak">
            <div className="flex items-start gap-3">
                <div className="flex items-center justify-center rounded-lg size-9 shrink-0 bg-n-alpha-2 text-n-slate-12">
                    <Icon icon={icon} className="size-5" />
                </div>
                <div className="flex flex-col gap-0.5">
                    <h6 className="text-sm font-medium text-n-slate-12">{title}</h6>
                    {description ? <span className="text-sm text-n-slate-11">{description}</span> : null}
                </div>
            </div>
            {children}
        </div>
    );
}
