import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { useBranding } from 'shared/composables/useBranding';
import FormInput from 'v3/components/Form/Input';
import AuthShell, { authCard } from 'v3/components/AuthShell';
import NextButton from 'dashboard/components-next/button/Button';
import MfaVerification from 'dashboard/components/auth/MfaVerification';
import SessionLimitOverlay from 'dashboard/components/auth/SessionLimitOverlay';
import type { UserSessionRow } from 'dashboard/settings/profile/ActiveSessions';
import type { SharedPageProps } from '../../../types';
import { BrandMark } from '../../components/BrandMark';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Khoá lỗi máy chủ trả khi trang để mở quá lâu (token CSRF hết hạn), cùng chuỗi
// với App\Support\SessionExpiryResponses::PAGE_EXPIRED_ERROR.
const PAGE_EXPIRED_ERROR = 'page_expired';

// Port từ v3/views/login/Index.vue (Google OAuth + SAML chưa port — xem bảng
// trace A1). Chatwoot nhận 206/409 từ axios; Yona là Inertia nên hai trạng thái
// "cần OTP" và "chạm trần phiên" về qua prop của chính trang này.
interface LoginPageProps extends SharedPageProps {
    mfaRequired?: boolean;
    mfaToken?: string;
    mfaError?: string | null;
    sessionsLimitReached?: boolean;
    sessions?: UserSessionRow[];
    // Link SSO (Platform API / impersonate) mở đúng trang này kèm hai giá trị đó.
    email?: string | null;
    ssoAuthToken?: string | null;
}

export default function LoginIndex() {
    const {
        errors,
        mfaRequired,
        mfaToken,
        mfaError,
        sessionsLimitReached,
        sessions,
        email: ssoEmail,
        ssoAuthToken,
    } = usePage<LoginPageProps>().props;
    const { replaceInstallationName } = useBranding();

    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [touched, setTouched] = useState({ email: false, password: false });
    const [showLoading, setShowLoading] = useState(false);
    const [hasErrored, setHasErrored] = useState(false);
    // Người dùng bấm "quay lại đăng nhập" ở bước OTP / màn chọn phiên: prop từ
    // server vẫn còn nên cần cờ phía client để quay về form mật khẩu.
    const [dismissed, setDismissed] = useState(false);

    const emailInvalid = !credentials.email || !EMAIL_REGEX.test(credentials.email);
    const passwordInvalid = !credentials.password;

    const showMfa = Boolean(mfaRequired && mfaToken) && !dismissed;
    const showSessionLimit = Boolean(sessionsLimitReached) && !dismissed;

    useEffect(() => {
        document.title = replaceInstallationName(t('LOGIN.TITLE'));
    }, [replaceInstallationName]);

    const postLogin = (payload: Record<string, string | number | boolean>, retriedAfterPageExpired = false) => {
        setHasErrored(false);
        setDismissed(false);
        setShowLoading(true);

        router.post('/app/login', payload, {
            onError: pageErrors => {
                // Máy chủ vừa cấp token mới cùng lỗi này: gửi lại một lần để người
                // dùng chỉ phải bấm Đăng nhập một lần.
                if (pageErrors[PAGE_EXPIRED_ERROR] && !retriedAfterPageExpired) {
                    postLogin(payload, true);
                    return;
                }
                setShowLoading(false);
                setHasErrored(true);
                useAlert(
                    pageErrors[PAGE_EXPIRED_ERROR] || pageErrors.email || pageErrors.password || t('LOGIN.API.UNAUTH'),
                );
            },
            onSuccess: page => {
                setShowLoading(false);
                // Đăng nhập chưa xong khi còn bước OTP / màn chọn phiên: thông báo
                // "đăng nhập thành công" ở đây sẽ sai.
                const props = page.props as unknown as LoginPageProps;
                if (props.mfaRequired || props.sessionsLimitReached) return;
                useAlert(t('LOGIN.API.SUCCESS_MESSAGE'));
            },
        });
    };

    const submitLogin = (extraParams: Record<string, string | number | boolean> = {}) =>
        postLogin({ email: credentials.email, password: credentials.password, ...extraParams });

    // created() của bản gốc: có sso_auth_token thì đăng nhập ngay, không chờ form.
    useEffect(() => {
        if (!ssoAuthToken || !ssoEmail) return;
        postLogin({ email: decodeURIComponent(ssoEmail), password: '', sso_auth_token: ssoAuthToken });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ssoAuthToken, ssoEmail]);

    const submitFormLogin = (event: FormEvent) => {
        event.preventDefault();
        if (emailInvalid) {
            useAlert(t('LOGIN.EMAIL.ERROR'));
            return;
        }
        submitLogin();
    };

    const resetAfterCancel = () => {
        setDismissed(true);
        setShowLoading(false);
        setCredentials(current => ({ ...current, password: '' }));
    };

    return (
        <AuthShell>
            {showSessionLimit ? (
                <SessionLimitOverlay
                    sessions={sessions ?? []}
                    onRevoke={sessionId => submitLogin({ revoke_session_id: sessionId })}
                    onRevokeAll={() => submitLogin({ revoke_all_sessions: true })}
                    onCancel={resetAfterCancel}
                />
            ) : showMfa ? (
                <MfaVerification
                    isVerifying={showLoading}
                    errorMessage={mfaError ?? ''}
                    onVerify={({ otpCode, backupCode }) =>
                        postLogin({
                            mfa_token: mfaToken ?? '',
                            otp_code: otpCode ?? '',
                            backup_code: backupCode ?? '',
                        })
                    }
                    onCancel={resetAfterCancel}
                />
            ) : (
                <div className={`${authCard} ${hasErrored ? 'animate-wiggle' : ''}`}>
                    <div className="mb-6">
                        <BrandMark className="h-7" />
                        <h2 className="mt-6 text-2xl font-semibold text-n-slate-12">
                            {replaceInstallationName(t('LOGIN.TITLE'))}
                        </h2>
                        <p className="mt-2 text-sm text-n-slate-11">
                            {t('COMMON.OR')}{' '}
                            <a
                                href="/app/auth/signup"
                                className="lowercase text-n-blue-10 font-medium hover:text-n-blue-11"
                            >
                                {t('LOGIN.CREATE_NEW_ACCOUNT')}
                            </a>
                        </p>
                    </div>
                    <form className="space-y-5" onSubmit={submitFormLogin}>
                        <FormInput
                            value={credentials.email}
                            onChange={event => {
                                setCredentials(current => ({ ...current, email: event.target.value }));
                                setTouched(current => ({ ...current, email: true }));
                            }}
                            name="email_address"
                            type="text"
                            data-testid="email_input"
                            tabIndex={1}
                            required
                            label={t('LOGIN.EMAIL.LABEL')}
                            placeholder={t('LOGIN.EMAIL.PLACEHOLDER')}
                            hasError={(touched.email && emailInvalid) || Boolean(errors?.email)}
                        />
                        <FormInput
                            value={credentials.password}
                            onChange={event => {
                                setCredentials(current => ({ ...current, password: event.target.value }));
                                setTouched(current => ({ ...current, password: true }));
                            }}
                            type="password"
                            name="password"
                            data-testid="password_input"
                            required
                            tabIndex={2}
                            label={t('LOGIN.PASSWORD.LABEL')}
                            placeholder={t('LOGIN.PASSWORD.PLACEHOLDER')}
                            hasError={touched.password && passwordInvalid}
                            rightOfLabel={
                                <p>
                                    <a href="/app/auth/reset/password" className="text-sm text-link" tabIndex={4}>
                                        {t('LOGIN.FORGOT_PASSWORD')}
                                    </a>
                                </p>
                            }
                        />
                        <NextButton
                            lg
                            type="submit"
                            data-testid="submit_button"
                            className="w-full"
                            tabIndex={3}
                            label={t('LOGIN.SUBMIT')}
                            disabled={showLoading}
                            isLoading={showLoading}
                        />
                    </form>
                    <a
                        href="/"
                        className="flex items-center gap-1.5 mt-6 text-sm font-medium w-fit text-n-slate-11 hover:text-n-slate-12"
                    >
                        <span className="i-lucide-arrow-left size-4" aria-hidden="true" />
                        {t('LANDING.nav.back_to_home')}
                    </a>
                </div>
            )}
        </AuthShell>
    );
}
