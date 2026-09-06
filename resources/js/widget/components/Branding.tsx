import { useWidgetState } from '../store/hooks';
import { t } from '../i18n';

// Port từ shared/components/Branding.vue (+ useBranding: thay tên cài đặt vào chuỗi).
export default function Branding({ disableBranding = false }: { disableBranding?: boolean }) {
    const globalConfig = useWidgetState(state => state.globalConfig);
    const referrerHost = useWidgetState(state => state.appConfig.referrerHost);

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
    const label = t('POWERED_BY').replace(/Chatwoot/g, globalConfig.INSTALLATION_NAME ?? globalConfig.BRAND_NAME);

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
