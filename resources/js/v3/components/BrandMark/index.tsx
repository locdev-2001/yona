import { usePage } from '@inertiajs/react';

import type { SharedPageProps } from '../../../types';

// Logo thương hiệu ở các màn công khai (đăng nhập, đăng ký…). Gom về một chỗ vì
// trước đây mỗi màn tự lặp cặp <img> sáng/tối — sửa logo hay đổi đích liên kết
// phải sờ nhiều file. Bấm vào logo quay về trang chủ, như mọi trang SaaS.
export function BrandMark({ className = 'h-8', href = '/' }: { className?: string; href?: string }) {
    const { globalConfig } = usePage<SharedPageProps>().props;

    return (
        <a href={href} className="inline-block">
            <img src={globalConfig.logo} alt={globalConfig.installationName} className={`block w-auto ${className} dark:hidden`} />
            {globalConfig.logoDark ? (
                <img src={globalConfig.logoDark} alt={globalConfig.installationName} className={`hidden w-auto ${className} dark:block`} />
            ) : null}
        </a>
    );
}
