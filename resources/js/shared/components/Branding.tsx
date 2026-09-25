import { fillInstallationName } from '../../i18n';

// Nhãn "Powered by" dùng chung cho widget và trang khảo sát công khai; hai nơi
// lấy `globalConfig` từ hai nguồn khác nhau nên cấu hình được truyền vào chứ
// không đọc store ở đây.
export interface BrandingConfig {
    LOGO_THUMBNAIL?: string;
    BRAND_NAME?: string;
    WIDGET_BRAND_URL?: string;
    INSTALLATION_NAME?: string;
}

interface BrandingProps {
    globalConfig: BrandingConfig;
    // Chuỗi "Powered by {installationName}" của chính bundle gọi vào (widget / survey).
    poweredByLabel: string;
    referrerHost?: string;
    disableBranding?: boolean;
}

export interface ResolvedBranding {
    href: string;
    label: string;
    brandName: string;
    logoUrl?: string;
}

// Một nguồn cho link và nhãn thương hiệu; mỗi bề mặt tự vẽ theo design của mình.
// Trả null khi không có thương hiệu hoặc tenant tắt dòng này.
export function resolveBranding({
    globalConfig,
    poweredByLabel,
    referrerHost = '',
    disableBranding = false,
}: BrandingProps): ResolvedBranding | null {
    if (!globalConfig.BRAND_NAME || disableBranding) return null;

    const href = (() => {
        try {
            const url = new URL(globalConfig.WIDGET_BRAND_URL ?? '');
            if (referrerHost) {
                url.searchParams.set('utm_source', referrerHost);
                url.searchParams.set('utm_medium', 'widget');
            } else {
                url.searchParams.set('utm_medium', 'survey');
            }
            url.searchParams.set('utm_campaign', 'branding');
            return url.toString();
        } catch {
            return '';
        }
    })();

    return {
        href,
        label: fillInstallationName(poweredByLabel, globalConfig.INSTALLATION_NAME ?? globalConfig.BRAND_NAME),
        brandName: globalConfig.BRAND_NAME,
        logoUrl: globalConfig.LOGO_THUMBNAIL,
    };
}

export default function Branding(props: BrandingProps) {
    const branding = resolveBranding(props);
    if (!branding) return <div className="p-3" />;

    return (
        <div className="px-0 py-3 flex justify-center">
            <a
                href={branding.href}
                rel="noreferrer noopener nofollow"
                target="_blank"
                className="branding--link text-n-slate-11 hover:text-n-slate-12 cursor-pointer text-xs inline-flex grayscale-[1] hover:grayscale-0 hover:opacity-100 opacity-90 no-underline justify-center items-center leading-3"
            >
                <img className="ltr:mr-1 rtl:ml-1 max-w-3 max-h-3" alt={branding.brandName} src={branding.logoUrl} />
                <span>{branding.label}</span>
            </a>
        </div>
    );
}
