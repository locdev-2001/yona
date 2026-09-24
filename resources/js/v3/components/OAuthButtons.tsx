import { t } from '../../i18n';
import SimpleDivider from 'v3/components/Divider/SimpleDivider';

// Nút đăng nhập / đăng ký bằng nhà cung cấp OAuth ở trang auth. Máy chủ chỉ gửi
// tên nhà cung cấp đã cấu hình; thêm nhà cung cấp = thêm một dòng ở đây.
const PROVIDER_BUTTONS: Record<string, { icon: string; labelKey: string }> = {
    google: { icon: 'i-simple-icons-google', labelKey: 'LOGIN.OAUTH.GOOGLE_CONTINUE' },
};

interface OAuthButtonsProps {
    providers?: string[];
    error?: string;
}

export default function OAuthButtons({ providers = [], error }: OAuthButtonsProps) {
    const available = providers.filter(provider => provider in PROVIDER_BUTTONS);

    if (available.length === 0) return null;

    return (
        <div>
            <div className="space-y-3">
                {available.map(provider => (
                    // Thẻ <a> thường, không qua router Inertia: trang đi hẳn sang nhà cung cấp.
                    <a
                        key={provider}
                        href={`/app/auth/oauth/${provider}`}
                        data-testid={`oauth_${provider}`}
                        className="flex items-center justify-center gap-2 w-full h-11 md:h-10 px-4 rounded border border-n-slate-12 text-sm font-medium text-n-slate-12 hover:bg-n-alpha-2 active:scale-[0.97] transition-transform duration-150 ease-out"
                    >
                        <span className={`${PROVIDER_BUTTONS[provider].icon} size-4`} aria-hidden="true" />
                        {t(PROVIDER_BUTTONS[provider].labelKey)}
                    </a>
                ))}
            </div>
            {error ? (
                <p role="alert" className="mt-3 text-sm text-n-ruby-11">
                    {error}
                </p>
            ) : null}
            <SimpleDivider label={t('COMMON.OR')} className="lowercase" />
        </div>
    );
}
