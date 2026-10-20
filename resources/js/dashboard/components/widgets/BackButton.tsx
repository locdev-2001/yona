import { router } from '@inertiajs/react';

import { t } from '../../../i18n';

// Port từ dashboard/components/widgets/BackButton.vue.
interface BackButtonProps {
    backUrl?: string;
    buttonLabel?: string;
    compact?: boolean;
    // Điện thoại: chỉ còn mũi tên trong ô chạm 44px, chữ vẫn đọc được bằng trình đọc màn hình.
    isIconOnlyBelowMd?: boolean;
    className?: string;
}

export default function BackButton({
    backUrl = '',
    buttonLabel = '',
    compact = false,
    isIconOnlyBelowMd = false,
    className = '',
}: BackButtonProps) {
    const goBack = () => {
        if (backUrl !== '') {
            router.visit(backUrl);
        } else {
            window.history.back();
        }
    };

    return (
        <button
            type="button"
            className={`flex items-center p-0 touch:min-h-[44px] font-normal cursor-pointer text-n-slate-11 ${compact ? 'text-sm' : 'text-base'} ${
                isIconOnlyBelowMd ? 'max-md:justify-center max-md:size-[44px] max-md:shrink-0' : ''
            } ${className}`}
            onClickCapture={goBack}
        >
            <i className={`i-lucide-chevron-left -ml-1 text-lg ${isIconOnlyBelowMd ? 'max-md:ml-0 max-md:text-xl' : ''}`} />
            <span className={isIconOnlyBelowMd ? 'max-md:sr-only' : ''}>{buttonLabel || t('GENERAL_SETTINGS.BACK')}</span>
        </button>
    );
}
