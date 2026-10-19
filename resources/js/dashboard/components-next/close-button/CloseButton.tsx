import Icon from 'dashboard/components-next/icon/Icon';
import Kbd from 'dashboard/components-next/kbd/Kbd';
import { t } from '../../../i18n';

interface CloseButtonProps {
    onClick: () => void;
    label?: string;
    className?: string;
}

// Nút đóng dùng chung cho cửa sổ, hộp thoại, panel: chip Esc trên máy tính (nơi dùng
// nút này phải đóng được bằng phím Esc), dấu ✕ trên điện thoại vì không có bàn phím.
export default function CloseButton({ onClick, label, className = '' }: CloseButtonProps) {
    const accessibleLabel = label ?? t('GENERAL.CLOSE');

    return (
        <button
            type="button"
            className={`inline-flex items-center justify-center h-8 min-w-8 px-1.5 rounded-lg text-n-slate-11 hover:bg-n-alpha-2 hover:text-n-slate-12 transition-colors ${className}`}
            aria-label={accessibleLabel}
            title={accessibleLabel}
            onClick={onClick}
        >
            <Icon icon="i-lucide-x" className="size-4 md:hidden" />
            <Kbd keyName="esc" className="max-md:hidden" />
        </button>
    );
}
