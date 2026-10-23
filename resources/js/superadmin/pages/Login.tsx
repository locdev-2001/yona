import type { ReactNode } from 'react';
import ConsoleAuthLayout from '../components/ConsoleAuthLayout';
import { Head, useForm, usePage } from '@inertiajs/react';

import Login from '@admin/views/pages/auth/login';
import LoginForm from '@admin/views/pages/auth/login/login-form';

import { useConsoleLabels } from '../labels';
import type { SuperAdminPageProps } from '../types';

export default function SuperAdminLogin({ loginUrl }: { loginUrl: string }) {
    const { flash } = usePage<SuperAdminPageProps>().props;
    const { data, setData, post, processing, errors } = useForm({
        super_admin: { email: '', password: '' },
    });
    const label = useConsoleLabels();
    const fieldErrors = errors as Record<string, string | undefined>;
    return (
        <>
            <Head title={label('login_title')} />
            <Login title={label('login_title')} description={label('login_description')}>
                <LoginForm
                    id="new_super_admin"
                    email={data.super_admin.email}
                    password={data.super_admin.password}
                    error={flash?.error}
                    processing={processing}
                    fieldErrors={{ email: fieldErrors['super_admin.email'], password: fieldErrors['super_admin.password'] }}
                    labels={{
                        email: label('login_email'),
                        emailPlaceholder: label('login_email_placeholder'),
                        password: label('login_password'),
                        submit: label('login_submit'),
                        showPassword: label('show_secret'),
                        hidePassword: label('hide_secret'),
                    }}
                    onEmailChange={email => setData('super_admin', { ...data.super_admin, email })}
                    onPasswordChange={password => setData('super_admin', { ...data.super_admin, password })}
                    onSubmit={() => post(loginUrl)}
                />
            </Login>
        </>
    );
}

SuperAdminLogin.layout = (page: ReactNode) => <ConsoleAuthLayout>{page}</ConsoleAuthLayout>;
