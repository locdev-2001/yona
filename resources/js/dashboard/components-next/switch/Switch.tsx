import { t } from '../../../i18n';

// Port từ dashboard/components-next/switch/Switch.vue
interface SwitchProps {
    value: boolean;
    // Tên đọc cho trình đọc màn hình; mặc định là "Bật/tắt" chung.
    ariaLabel?: string;
    // Có nhãn thì cả hàng (nhãn + công tắc) là một nút, đích chạm cao 44px.
    label?: string;
    onChange: (value: boolean) => void;
}

export default function Switch({ value, ariaLabel = '', label, onChange }: SwitchProps) {
    const track = (
        <span
            className={`group relative block h-4 w-7 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out ${
                value ? 'bg-n-brand' : 'bg-n-slate-6'
            }`}
            aria-hidden={label ? true : undefined}
        >
            <span
                className={`absolute top-1/2 ltr:left-0.5 rtl:right-0.5 -translate-y-1/2 transition-transform duration-[350ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                    value
                        ? 'ltr:translate-x-3 rtl:-translate-x-3 group-active:ltr:translate-x-[6px] rtl:group-active:-translate-x-[6px]'
                        : 'ltr:translate-x-0 rtl:translate-x-0'
                }`}
            >
                <span className="block h-3 w-3 rounded-full bg-n-background shadow-md transition-[width] duration-[180ms] ease-in-out group-active:w-[18px]" />
            </span>
        </span>
    );

    if (label) {
        return (
            <button
                type="button"
                role="switch"
                aria-checked={value}
                onClick={() => onChange(!value)}
                className="flex min-h-11 w-full select-none items-center justify-between gap-4 rounded p-0 text-left text-sm text-n-slate-12 focus:outline-none focus-visible:ring-1 focus-visible:ring-n-brand"
            >
                <span>{label}</span>
                {track}
            </button>
        );
    }

    return (
        <button
            type="button"
            className="flex-shrink-0 select-none rounded-full focus:outline-none focus:ring-1 focus:ring-n-brand focus:ring-offset-2 focus:ring-offset-n-slate-2"
            role="switch"
            aria-checked={value}
            onClick={() => onChange(!value)}
        >
            <span className="sr-only">{ariaLabel || t('SWITCH.TOGGLE')}</span>
            {track}
        </button>
    );
}
