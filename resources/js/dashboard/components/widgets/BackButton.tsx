import { t } from '../../../i18n';

// Port từ dashboard/components/widgets/BackButton.vue — router.go(-1) của
// vue-router thay bằng history.back(); backUrl là URL thật.
interface BackButtonProps {
    backUrl?: string;
    buttonLabel?: string;
    compact?: boolean;
    className?: string;
}

export default function BackButton({
    backUrl = '',
    buttonLabel = '',
    compact = false,
    className = '',
}: BackButtonProps) {
    const goBack = () => {
        if (backUrl !== '') {
            window.location.href = backUrl;
        } else {
            window.history.back();
        }
    };

    return (
        <button
            className={`flex items-center p-0 font-normal cursor-pointer text-n-slate-11 ${
                compact ? 'text-sm' : 'text-base'
            } ${className}`}
            onClick={goBack}
        >
            <i className="i-lucide-chevron-left -ml-1 text-lg" />
            {buttonLabel || t('GENERAL_SETTINGS.BACK')}
        </button>
    );
}
