import { t } from '../../i18n';
import Icon from 'dashboard/components-next/icon/Icon';
import Label from 'dashboard/components-next/label/Label';

// Port từ dashboard/components/ChannelSelector.vue (bỏ voice badge — kênh voice
// là EE/beta chưa port).
interface ChannelSelectorProps {
    title: string;
    description?: string;
    icon: string;
    logoUrl?: string | null;
    isComingSoon?: boolean;
    isBeta?: boolean;
    disabled?: boolean;
    onClick?: () => void;
}

export default function ChannelSelector({
    title,
    description = '',
    icon,
    logoUrl = null,
    isComingSoon = false,
    isBeta = false,
    disabled = false,
    onClick,
}: ChannelSelectorProps) {
    return (
        <button
            type="button"
            disabled={disabled}
            className={[
                'relative bg-n-solid-1 gap-6 cursor-pointer rounded-2xl flex flex-col justify-start transition-all duration-200 ease-in -m-px py-6 px-5 items-start border border-solid border-n-weak',
                isComingSoon
                    ? 'cursor-not-allowed disabled:opacity-80'
                    : 'hover:enabled:border-n-blue-9 hover:enabled:shadow-md disabled:opacity-60 disabled:cursor-not-allowed',
            ].join(' ')}
            onClick={onClick}
        >
            <div className="relative">
                {logoUrl ? (
                    <img src={logoUrl} alt="" className="size-10 object-contain" />
                ) : (
                    <div className="flex size-10 items-center justify-center rounded-full bg-n-alpha-2">
                        <Icon icon={icon} className="text-n-slate-10 size-6" />
                    </div>
                )}
            </div>

            <div className="flex flex-col items-start gap-1.5">
                <div className="flex items-center gap-2">
                    <h3 className="text-n-slate-12 text-sm text-start font-medium capitalize">{title}</h3>
                    {isBeta && !isComingSoon ? (
                        <Label label={t('GENERAL.BETA')} title={t('GENERAL.BETA_DESCRIPTION')} color="blue" compact />
                    ) : null}
                </div>
                <p className="text-n-slate-11 text-start text-sm">{description}</p>
            </div>

            {isComingSoon ? (
                <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[2px] rounded-2xl bg-gradient-to-br from-n-surface-1/90 via-n-surface-1/70 to-n-surface-1/95 cursor-not-allowed">
                    <span className="text-n-slate-12 font-medium text-sm">
                        {t('CHANNEL_SELECTOR.COMING_SOON')} 🚀
                    </span>
                </div>
            ) : null}
        </button>
    );
}
