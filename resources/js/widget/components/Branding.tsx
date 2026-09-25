import { resolveBranding } from 'shared/components/Branding';

import { useWidgetState } from '../store/hooks';
import { t } from '../i18n';

// Dòng "Powered by" của widget: chữ nhỏ canh giữa, nằm trong footer trắng ngay
// dưới ô nhập (theo design khung chat). Link và nhãn lấy từ nguồn dùng chung với
// trang khảo sát công khai. Hộp chạm của link cao 44px (widget.scss, .yona-branding-link).
export default function Branding({ disableBranding = false }: { disableBranding?: boolean }) {
    const globalConfig = useWidgetState(state => state.globalConfig);
    const referrerHost = useWidgetState(state => state.appConfig.referrerHost);

    const branding = resolveBranding({ globalConfig, poweredByLabel: t('POWERED_BY'), referrerHost, disableBranding });
    if (!branding) return null;

    return (
        <div className="flex justify-center">
            <a
                href={branding.href}
                rel="noreferrer noopener nofollow"
                target="_blank"
                className="branding--link yona-branding-link text-[10.5px] leading-[1.2] text-[var(--yona-chat-ink-muted)] no-underline hover:text-[var(--yona-chat-ink-soft)]"
            >
                {branding.label}
            </a>
        </div>
    );
}
