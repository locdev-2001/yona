import type { LandingConfig } from '../config';

// Logo đổi theo nền: bản thường chìm trên nền tối, bản tối chìm trên nền sáng.
// Đổi bằng CSS chứ không bằng state để không chớp logo lúc tải và không phải
// nhân đôi logic chủ đề ở hai chỗ (đầu trang + chân trang).
export function BrandLogo({ brand, className = 'h-8 w-auto' }: { brand: LandingConfig['brand']; className?: string }) {
    return (
        <>
            <img src={brand.logo} alt={brand.name} className={`${className} dark:hidden`} />
            <img src={brand.logo_dark} alt={brand.name} className={`${className} hidden dark:block`} />
        </>
    );
}
