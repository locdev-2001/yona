import { t } from '../../../../i18n';
import SignupForm from './components/Signup/Form';
import AuthShell, { AuthHomeLink, AuthSwitchLink, authCard } from 'v3/components/AuthShell';
import { BrandMark } from '../../../components/BrandMark';

// Port từ v3/views/auth/signup/Index.vue
// (Testimonials chỉ hiện trên bản cloud — bỏ).
export default function SignupIndex() {
    return (
        <AuthShell>
            <div className={authCard}>
                <div className="mb-6">
                    <BrandMark className="h-7" />
                    <h2 className="mt-6 text-2xl font-semibold text-n-slate-12">{t('REGISTER.TRY_WOOT')}</h2>
                    <p className="mt-2 mb-0 text-sm text-n-slate-11">{t('REGISTER.SUBTITLE')}</p>
                </div>
                <SignupForm />
                <AuthSwitchLink prompt={t('REGISTER.HAVE_AN_ACCOUNT')} label={t('LOGIN.SUBMIT')} href="/app/login" />
                <AuthHomeLink />
            </div>
        </AuthShell>
    );
}
