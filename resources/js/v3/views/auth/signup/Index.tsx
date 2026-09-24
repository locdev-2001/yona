import { t } from '../../../../i18n';
import SignupForm from './components/Signup/Form';
import AuthShell from 'v3/components/AuthShell';
import { BrandMark } from '../../../components/BrandMark';

// Port từ v3/views/auth/signup/Index.vue
// (Testimonials chỉ hiện trên bản cloud — bỏ).
export default function SignupIndex() {
    return (
        <AuthShell>
            <div className="flex max-w-[960px] bg-white dark:bg-n-solid-2 rounded-lg outline outline-1 outline-n-container shadow-sm">
                <div className="flex-1 flex items-center justify-center py-10 px-10">
                    <div className="max-w-[420px] w-full">
                        <div className="mb-6">
                            <BrandMark className="h-7" />
                            <h2 className="mt-6 text-2xl font-semibold text-n-slate-12">{t('REGISTER.TRY_WOOT')}</h2>
                            <p className="mt-2 text-sm text-n-slate-11">
                                {t('REGISTER.HAVE_AN_ACCOUNT')}{' '}
                                <a className="text-n-blue-10 font-medium hover:text-n-blue-11" href="/app/login">
                                    {t('LOGIN.SUBMIT')}
                                </a>
                            </p>
                        </div>
                        <SignupForm />
                        <a
                            href="/"
                            className="flex items-center gap-1.5 mt-6 text-sm font-medium w-fit text-n-slate-11 hover:text-n-slate-12"
                        >
                            <span className="i-lucide-arrow-left size-4" aria-hidden="true" />
                            {t('LANDING.nav.back_to_home')}
                        </a>
                    </div>
                </div>
            </div>
        </AuthShell>
    );
}
