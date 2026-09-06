// Port từ shared/components/Branding.vue + useBranding — dùng chung cho widget
// và trang khảo sát công khai; hai nơi lấy `globalConfig` từ hai nguồn khác nhau
// nên cấu hình được truyền vào chứ không đọc store ở đây.
export interface BrandingConfig {
    LOGO_THUMBNAIL?: string;
    BRAND_NAME?: string;
    WIDGET_BRAND_URL?: string;
    INSTALLATION_NAME?: string;
}

interface BrandingProps {
    globalConfig: BrandingConfig;
    // Chuỗi "Powered by Chatwoot" của chính bundle gọi vào (widget / survey).
    poweredByLabel: string;
    referrerHost?: string;
    disableBranding?: boolean;
}

export default function Branding({
    globalConfig,
    poweredByLabel,
    referrerHost = '',
    disableBranding = false,
}: BrandingProps) {
    if (!globalConfig.BRAND_NAME || disableBranding) return <div className="p-3" />;

    const brandRedirectURL = (() => {
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

    // replaceInstallationName: "Powered by Chatwoot" → tên cài đặt thật.
    const label = poweredByLabel.replace(/Chatwoot/g, globalConfig.INSTALLATION_NAME ?? globalConfig.BRAND_NAME);

    return (
        <div className="px-0 py-3 flex justify-center">
            <a
                href={brandRedirectURL}
                rel="noreferrer noopener nofollow"
                target="_blank"
                className="branding--link text-n-slate-11 hover:text-n-slate-12 cursor-pointer text-xs inline-flex grayscale-[1] hover:grayscale-0 hover:opacity-100 opacity-90 no-underline justify-center items-center leading-3"
            >
                <img
                    className="ltr:mr-1 rtl:ml-1 max-w-3 max-h-3"
                    alt={globalConfig.BRAND_NAME}
                    src={globalConfig.LOGO_THUMBNAIL}
                />
                <span>{label}</span>
            </a>
        </div>
    );
}
