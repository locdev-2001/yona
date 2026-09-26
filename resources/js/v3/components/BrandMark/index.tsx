import { usePage } from '@inertiajs/react';

import type { SharedPageProps } from '../../../types';

export function BrandMark({ className = 'h-8', href = '/' }: { className?: string; href?: string }) {
    const { globalConfig } = usePage<SharedPageProps>().props;

    return (
        // py + -my bù lại: đích chạm ≥44px trên điện thoại — logo cỡ h-7/h-8
        // tự nó chỉ cao 28-32px.
        <a href={href} className="inline-block py-3 -my-3">
            <img src={globalConfig.logo} alt={globalConfig.installationName} className={`block w-auto ${className}`} />
        </a>
    );
}
