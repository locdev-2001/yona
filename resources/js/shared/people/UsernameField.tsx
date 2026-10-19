import { t } from '../../i18n';
import type { UsernameAvailability } from './useUsernameAvailability';

interface UsernameFieldProps {
    value: string;
    onChange: (value: string) => void;
    availability: UsernameAvailability;
    serverError?: string;
}

const STATUS_TEXT: Partial<Record<UsernameAvailability, { key: string; tone: string }>> = {
    checking: { key: 'PEOPLE.USERNAME.CHECKING', tone: 'text-n-slate-11' },
    available: { key: 'PEOPLE.USERNAME.AVAILABLE', tone: 'text-n-teal-11' },
    unavailable: { key: 'PEOPLE.USERNAME.UNAVAILABLE', tone: 'text-n-ruby-11' },
};

// Ô @username dùng chung cho màn chào mừng và trang hồ sơ: tự chuyển chữ thường,
// báo ngay tên còn trống hay không.
export default function UsernameField({ value, onChange, availability, serverError }: UsernameFieldProps) {
    const status = serverError ? { text: serverError, tone: 'text-n-ruby-11' } : null;
    const live = STATUS_TEXT[availability];
    const hasError = Boolean(serverError) || availability === 'unavailable';

    return (
        <div>
            <label htmlFor="username" className="block text-sm font-medium text-n-slate-12">
                {t('PEOPLE.USERNAME.LABEL')}
            </label>
            <div
                className={`mt-1 flex items-center rounded bg-n-alpha-black2 outline outline-1 focus-within:outline-n-brand ${
                    hasError ? 'outline-n-ruby-8' : 'outline-n-weak'
                }`}
            >
                <span className="pl-3 text-n-slate-11" aria-hidden="true">
                    @
                </span>
                <input
                    id="username"
                    name="username"
                    value={value}
                    onChange={event => onChange(event.target.value.toLowerCase().replace(/^@/, ''))}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={30}
                    aria-invalid={hasError}
                    aria-describedby="username-status"
                    className="reset-base min-h-11 w-full border-none bg-transparent px-1 py-3 text-n-slate-12 outline-none sm:text-sm"
                />
                {availability === 'available' ? (
                    <span className="i-lucide-check mr-3 size-4 text-n-teal-11" aria-hidden="true" />
                ) : null}
            </div>
            <p
                id="username-status"
                className={`mt-1 text-sm ${status?.tone ?? live?.tone ?? 'text-n-slate-11'}`}
                aria-live="polite"
            >
                {status?.text ?? (live ? t(live.key) : t('PEOPLE.USERNAME.HINT'))}
            </p>
        </div>
    );
}
