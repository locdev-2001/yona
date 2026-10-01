import { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';

import MfaVerification from 'dashboard/components/auth/MfaVerification';
import type { SuperAdminPageProps } from '../types';

const INPUT_CLASS =
    'block w-full rounded-md border-0 px-3 py-3 appearance-none shadow-sm ring-1 ring-inset text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-woot-500 sm:text-sm sm:leading-6 outline-none ring-slate-200';

interface SuperAdminLoginPageProps extends SuperAdminPageProps {
    otpRequired?: boolean;
    otpToken?: string;
    otpError?: string | null;
}

// Port từ app/views/super_admin/devise/sessions/new.html.erb. Thêm bước OTP
// sau mật khẩu khi tài khoản đã bật 2FA — cùng component MfaVerification với
// màn đăng nhập agent (v3/views/login/Index.tsx).
export default function SuperAdminLogin() {
    const { flash, superAdmin, otpRequired, otpToken, otpError } = usePage<SuperAdminLoginPageProps>().props;
    const { data, setData, post, processing } = useForm({
        super_admin: { email: '', password: '' },
    });
    const [verifying, setVerifying] = useState(false);
    const [dismissedOtp, setDismissedOtp] = useState(false);

    const showOtp = Boolean(otpRequired && otpToken) && !dismissedOtp;

    const submitOtp = (payload: { otpCode?: string; backupCode?: string }) => {
        setVerifying(true);
        router.post(
            '/admin/sign_in',
            {
                otp_token: otpToken,
                otp_code: payload.otpCode ?? '',
                backup_code: payload.backupCode ?? '',
            },
            { onFinish: () => setVerifying(false) },
        );
    };

    if (showOtp) {
        return (
            <div className="h-full w-full antialiased">
                <Head title="SuperAdmin" />
                <main className="flex flex-col bg-woot-25 min-h-screen w-full py-20 sm:px-6 lg:px-8">
                    <MfaVerification
                        isVerifying={verifying}
                        errorMessage={otpError ?? ''}
                        onVerify={submitOtp}
                        onCancel={() => setDismissedOtp(true)}
                    />
                </main>
            </div>
        );
    }

    return (
        <div className="h-full w-full antialiased">
            <Head title="SuperAdmin" />
            <main className="flex flex-col bg-woot-25 min-h-screen w-full py-20 sm:px-6 lg:px-8">
                <section className="max-w-5xl mx-auto">
                    <img
                        src={superAdmin.logo}
                        alt={superAdmin.installationName}
                        className="mx-auto h-8 w-auto block"
                    />
                    <h2 className="mt-6 text-center text-3xl font-medium text-slate-900">
                        Howdy, admin 👋
                    </h2>
                </section>
                <section className="bg-white shadow sm:mx-auto mt-11 sm:w-full sm:max-w-lg p-11 sm:shadow-lg sm:rounded-lg mb-8 mt-15">
                    <div>
                        {flash?.error ? (
                            <p className="mb-5 text-sm text-ruby-600">{flash.error}</p>
                        ) : null}
                        <form
                            id="new_super_admin"
                            onSubmit={event => {
                                event.preventDefault();
                                post('/admin/sign_in');
                            }}
                        >
                            <div className="mb-5">
                                <label
                                    htmlFor="super_admin_email"
                                    className="flex justify-between text-sm font-medium leading-6 text-slate-900"
                                >
                                    Email Address
                                </label>
                                <div className="mt-1">
                                    <input
                                        autoFocus
                                        autoComplete="email"
                                        placeholder="Email eg: someone@example.com"
                                        className={INPUT_CLASS}
                                        type="email"
                                        id="super_admin_email"
                                        value={data.super_admin.email}
                                        onChange={event =>
                                            setData('super_admin', {
                                                ...data.super_admin,
                                                email: event.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="mb-5">
                                <label
                                    htmlFor="super_admin_password"
                                    className="flex justify-between text-sm font-medium leading-6 text-slate-900"
                                >
                                    Password
                                </label>
                                <div className="mt-1">
                                    <input
                                        autoComplete="current-password"
                                        placeholder="Password"
                                        className={INPUT_CLASS}
                                        type="password"
                                        id="super_admin_password"
                                        value={data.super_admin.password}
                                        onChange={event =>
                                            setData('super_admin', {
                                                ...data.super_admin,
                                                password: event.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex items-center w-full justify-center rounded-md bg-woot-500 py-3 px-3 text-base font-medium text-white shadow-sm hover:bg-woot-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-woot-500 cursor-pointer"
                            >
                                <span>Login</span>
                            </button>
                        </form>
                    </div>
                </section>
            </main>
        </div>
    );
}

SuperAdminLogin.layout = null;
