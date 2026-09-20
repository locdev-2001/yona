import { usePage } from '@inertiajs/react';

import type { SharedPageProps } from '../../../types';

// Tương đương next/icon/Logo.vue — logo mark Yona (thay logo woot, gỡ nhãn Chatwoot).
// Lấy từ globalConfig như BrandMark thay vì vẽ tay SVG: mark thật là ảnh gradient,
// và bản tự vẽ không đổi theo env LOGO_THUMBNAIL nên lệch với mọi bề mặt khác.
export default function Logo({ className }: { className?: string }) {
    const { globalConfig } = usePage<SharedPageProps>().props;

    return (
        <img
            src={globalConfig.logoThumbnail}
            alt={globalConfig.installationName}
            className={`object-contain rounded-md ${className ?? 'size-4'}`}
        />
    );
}
