import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import SignupForm from './components/Signup/Form';
import SnackbarContainer from 'v3/components/SnackBar/Container';
import type { SharedPageProps } from '../../../../types';
import signupBg from '../../../../../images/auth/signup-bg.jpg';
import { BrandMark } from '../../../components/BrandMark';

// Port từ v3/views/auth/signup/Index.vue
// (Testimonials chỉ hiện trên Chatwoot cloud — bỏ).
export default function SignupIndex() {
    const { globalConfig } = usePage<SharedPageProps>().props;

    return (
        <div
            className="relative w-full h-full min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat p-4"
            style={{ backgroundImage: `url(${signupBg})` }}
        >
            <div className="absolute inset-0 bg-n-gray-12/60 dark:bg-n-gray-1/80 backdrop-blur-sm" />
            <div className="relative flex max-w-[960px] bg-white dark:bg-n-solid-2 rounded-lg outline outline-1 outline-n-container shadow-sm">
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
            <SnackbarContainer />
        </div>
    );
}
