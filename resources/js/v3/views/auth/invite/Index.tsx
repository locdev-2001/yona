import { useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';

import type { SharedPageProps } from '../../../../types';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import AuthShell, { authCard } from 'v3/components/AuthShell';
import { BrandMark } from '../../../components/BrandMark';
import SignupJoinForm from './components/SignupJoinForm';
import OneClickJoin from './components/OneClickJoin';

type InviteStatus = 'active' | 'not_found' | 'revoked' | 'expired' | 'exhausted';

interface InvitePageProps extends SharedPageProps {
    status: InviteStatus;
    token: string;
    account: { name: string; role: 'agent' | 'administrator' } | null;
}

const ERROR_STATUS_KEYS: Record<Exclude<InviteStatus, 'active'>, string> = {
    not_found: 'NOT_FOUND',
    revoked: 'REVOKED',
    expired: 'EXPIRED',
    exhausted: 'EXHAUSTED',
};

// `noindex`: trang riêng cho một người, không có gì để xếp hạng (cùng lý do
// landing đặt noindex ở trang cảm ơn).
export default function InviteIndex() {
    const { status, token, account, auth, flash } = usePage<InvitePageProps>().props;

    useEffect(() => {
        if (flash.alert) useAlert(flash.alert);
    }, [flash.alert]);

    return (
        <AuthShell>
            <Head>
                <title>{t('INVITE_LINKS.PAGE.TITLE', { account: account?.name ?? '' })}</title>
                <meta name="robots" content="noindex, follow" />
            </Head>
            <div className={authCard}>
                <div className="flex flex-col items-center text-center gap-1 mb-6">
                    <BrandMark className="h-7" />
                </div>

                {status === 'active' && account ? (
                    <div className="flex flex-col items-center text-center gap-2 w-full">
                        <h1 className="text-2xl font-semibold text-n-slate-12">
                            {t('INVITE_LINKS.PAGE.TITLE', { account: account.name })}
                        </h1>
                        <p className="text-sm text-n-slate-11">
                            {t('INVITE_LINKS.PAGE.ROLE_BADGE', {
                                role: t(`AGENT_MGMT.AGENT_TYPES.${account.role.toUpperCase()}`),
                            })}
                        </p>

                        <div className="w-full mt-4">
                            {auth.user ? (
                                <OneClickJoin token={token} email={auth.user.email} />
                            ) : (
                                <>
                                    <h2 className="text-lg font-medium text-n-slate-12 mb-3">
                                        {t('INVITE_LINKS.PAGE.SIGNUP.TITLE', { account: account.name })}
                                    </h2>
                                    <SignupJoinForm token={token} />
                                    <p className="text-sm mt-5 mb-0 text-n-slate-11">
                                        {t('INVITE_LINKS.PAGE.LOGIN_LINK')}{' '}
                                        {/* py + -my bù lại: đích chạm ≥44px trên điện thoại, không
                                            đẩy lệch dòng chữ xung quanh. */}
                                        <a
                                            className="inline-block py-3 -my-3 text-n-blue-10 font-medium hover:text-n-blue-11"
                                            href="/app/login"
                                        >
                                            {t('LOGIN.SUBMIT')}
                                        </a>
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center gap-3">
                        <h1 className="text-2xl font-semibold text-n-slate-12">
                            {t(`INVITE_LINKS.PAGE.ERRORS.${ERROR_STATUS_KEYS[status as Exclude<InviteStatus, 'active'>]}.TITLE`)}
                        </h1>
                        <p className="text-sm text-n-slate-11 max-w-sm">
                            {t(`INVITE_LINKS.PAGE.ERRORS.${ERROR_STATUS_KEYS[status as Exclude<InviteStatus, 'active'>]}.DESC`)}
                        </p>
                        <a
                            href="/"
                            className="flex items-center gap-1.5 mt-4 py-3 -my-3 text-sm font-medium w-fit text-n-slate-11 hover:text-n-slate-12"
                        >
                            <span className="i-lucide-arrow-left size-4" aria-hidden="true" />
                            {t('INVITE_LINKS.PAGE.BACK_HOME')}
                        </a>
                    </div>
                )}
            </div>
        </AuthShell>
    );
}
