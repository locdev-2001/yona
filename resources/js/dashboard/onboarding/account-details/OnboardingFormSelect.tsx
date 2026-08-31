import Icon from 'dashboard/components-next/icon/Icon';
import type { SelectOption } from '../shared/constants';

// Port từ dashboard/routes/dashboard/onboarding/account-details/OnboardingFormSelect.vue
interface OnboardingFormSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    hasError?: boolean;
}

export default function OnboardingFormSelect({
    value,
    onChange,
    options,
    placeholder = '',
    hasError = false,
}: OnboardingFormSelectProps) {
    return (
        <div className="relative flex items-center justify-end">
            <select
                value={value}
                className={[
                    '!h-auto !w-auto !py-0 !ps-0 !pe-[17px] !m-0 !rounded-none !bg-transparent !bg-none !outline-none text-sm text-end border-0 cursor-pointer appearance-none focus:outline-none focus:ring-0',
                    value ? 'text-n-slate-12' : 'text-n-slate-9',
                    hasError ? 'animate-shake' : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
                onChange={event => onChange(event.target.value)}
            >
                {placeholder ? (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                ) : null}
                {options.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <Icon
                icon="i-lucide-chevron-down"
                className="pointer-events-none absolute end-0 top-1/2 -translate-y-1/2 text-n-slate-9"
            />
        </div>
    );
}
