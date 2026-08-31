import Icon from 'dashboard/components-next/icon/Icon';
import { t } from '../../../../../../i18n';

// Port từ v3/views/auth/signup/components/Signup/PasswordRequirements.vue
const MIN_PASSWORD_LENGTH = 6;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{}|'"/\\.,`<>:;?~]/;

export default function PasswordRequirements({ password = '' }: { password?: string }) {
    const requirements = [
        {
            id: 'length',
            met: password.length >= MIN_PASSWORD_LENGTH,
            label: t('REGISTER.PASSWORD.REQUIREMENTS_LENGTH', { min: MIN_PASSWORD_LENGTH }),
        },
        { id: 'uppercase', met: /[A-Z]/.test(password), label: t('REGISTER.PASSWORD.REQUIREMENTS_UPPERCASE') },
        { id: 'lowercase', met: /[a-z]/.test(password), label: t('REGISTER.PASSWORD.REQUIREMENTS_LOWERCASE') },
        { id: 'number', met: /[0-9]/.test(password), label: t('REGISTER.PASSWORD.REQUIREMENTS_NUMBER') },
        { id: 'special', met: SPECIAL_CHAR_REGEX.test(password), label: t('REGISTER.PASSWORD.REQUIREMENTS_SPECIAL') },
    ];

    return (
        <div className="absolute top-0 z-50 w-64 text-xs rounded-lg px-4 py-3 bg-white dark:bg-n-solid-3 shadow-lg outline outline-1 outline-n-weak start-full ms-4">
            <ul role="list" className="space-y-1.5">
                {requirements.map(item => (
                    <li key={item.id} className="inline-flex gap-1.5 items-start">
                        <Icon
                            icon={item.met ? 'i-lucide-circle-check-big' : 'i-lucide-circle'}
                            className={`flex-none flex-shrink-0 w-3 mt-0.5 ${item.met ? 'text-n-teal-10' : 'text-n-slate-10'}`}
                        />
                        <span className={item.met ? 'text-n-slate-11' : 'text-n-slate-10'}>{item.label}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
