import type { LandingConfig } from '../config';

// Một logo duy nhất: sản phẩm không có dark mode nên không cần biến thể tối.
// h-8: wordmark có mark đuôi cá voi cao hơn phần chữ, thấp hơn mức này thì chữ
// "yona" tụt xuống dưới ngưỡng đọc được.
export function BrandLogo({ brand, className = 'h-8 w-auto' }: { brand: LandingConfig['brand']; className?: string }) {
    return <img src={brand.logo} alt={brand.name} className={className} />;
}
