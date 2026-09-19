import { Head, router, useForm } from '@inertiajs/react';

import FieldValue from '../components/FieldValue';
import type { SuperAdminField } from '../types';

type AccountUserForm = {
    accountId?: number;
    userId?: number;
    accounts?: { value: number; label: string }[];
    users?: { value: number; label: string }[];
    roles: string[];
};

type Props = {
    resource: string;
    singularLabel: string;
    record: { id: number; title: string; url: string | null };
    fields: SuperAdminField[];
    accountUserForm?: AccountUserForm;
    mfaEnabled?: boolean;
    confirmed?: boolean;
    impersonateUrl?: string;
    actions: string[];
};

// Port từ app/views/super_admin/{accounts,users}/show.html.erb +
// administrate/application/show.html.erb.
export default function ResourceShow({
    resource,
    singularLabel,
    record,
    fields,
    accountUserForm,
    mfaEnabled,
    confirmed = true,
    impersonateUrl,
    actions,
}: Props) {
    return (
        <>
            <Head title={`Show ${record.title}`} />
            <header className="main-content__header" role="banner">
                <h1 className="main-content__page-title">Show {record.title}</h1>
                <div className="flex items-center gap-2">
                    {actions.includes('edit') ? (
                        <a className="button" href={`${record.url}/edit`}>
                            Edit
                        </a>
                    ) : null}
                    {resource === 'users' && !confirmed ? (
                        <button
                            type="button"
                            className="button"
                            onClick={() => router.post(`${record.url}/resend_confirmation`)}
                        >
                            Resend confirmation
                        </button>
                    ) : null}
                </div>
            </header>

            <section className="main-content__body">
                <dl>
                    <fieldset className="">
                        {fields.map(field => (
                            <div key={field.name}>
                                <dt className="attribute-label" id={field.name}>
                                    {field.label}
                                </dt>
                                <dd className={`attribute-data attribute-data--${field.html_class}`}>
                                    <FieldValue field={field} />
                                </dd>
                            </div>
                        ))}
                    </fieldset>
                    {mfaEnabled === undefined ? null : (
                        <>
                            <dt className="attribute-label" id="mfa_enabled">
                                MFA
                            </dt>
                            <dd className="attribute-data attribute-data--string">
                                <span
                                    className={`${
                                        mfaEnabled
                                            ? 'bg-green-100/70 text-green-800'
                                            : 'bg-slate-100 text-slate-700'
                                    } inline-flex items-center px-2 h-4 leading-4 rounded-xl text-xxs font-medium`}
                                >
                                    {mfaEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </dd>
                        </>
                    )}
                </dl>
            </section>

            {accountUserForm ? <AccountUserSection form={accountUserForm} /> : null}

            {impersonateUrl ? (
                <section className="main-content__body">
                    <hr />
                    <div className="form-actions">
                        <p className="text-color-red">
                            Caution: Any actions executed after impersonate will appear as if
                            performed by the impersonated user - [{record.title}]
                        </p>
                        <a className="button" target="_blank" rel="noreferrer" href={impersonateUrl}>
                            Impersonate user
                        </a>
                    </div>
                </section>
            ) : null}

            {resource === 'accounts' ? (
                <section className="main-content__body">
                    <hr />
                    <div className="form-actions">
                        <p className="pb-3">
                            This will clear the IndexedDB cache keys from redis. <br />
                            The next load will fetch the data from backend.
                        </p>
                        <input
                            type="submit"
                            value="Reset Frontend Cache"
                            onClick={() => router.post(`${record.url}/reset_cache`)}
                        />
                    </div>
                </section>
            ) : null}

            <span className="hidden">{singularLabel}</span>
        </>
    );
}

function AccountUserSection({ form }: { form: AccountUserForm }) {
    const { data, setData, post, processing } = useForm({
        account_user: {
            account_id: form.accountId ?? form.accounts?.[0]?.value ?? 0,
            user_id: form.userId ?? form.users?.[0]?.value ?? 0,
            role: form.roles[0],
        },
    });

    const options = form.accounts ?? form.users ?? [];
    const optionKey = form.accounts ? 'account_id' : 'user_id';

    return (
        <section className="main-content__body">
            <form
                className="form"
                onSubmit={event => {
                    event.preventDefault();
                    post('/super_admin/account_users');
                }}
            >
                <div className="field-unit field-unit--belongs-to-search field-unit--required">
                    <div className="field-unit__label">
                        <label htmlFor="account_user_related">{form.accounts ? 'Account' : 'User'}</label>
                    </div>
                    <div className="field-unit__field">
                        <select
                            id="account_user_related"
                            value={data.account_user[optionKey]}
                            onChange={event =>
                                setData('account_user', {
                                    ...data.account_user,
                                    [optionKey]: Number(event.target.value),
                                })
                            }
                        >
                            {options.map(option => (
                                <option value={option.value} key={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="field-unit field-unit--select field-unit--optional">
                    <div className="field-unit__label">
                        <label htmlFor="account_user_role">Role</label>
                    </div>
                    <div className="field-unit__field">
                        <select
                            id="account_user_role"
                            value={data.account_user.role}
                            onChange={event =>
                                setData('account_user', { ...data.account_user, role: event.target.value })
                            }
                        >
                            {form.roles.map(role => (
                                <option value={role} key={role}>
                                    {role}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="form-actions">
                    <input type="submit" value="Create Account user" disabled={processing} />
                </div>
            </form>
        </section>
    );
}
