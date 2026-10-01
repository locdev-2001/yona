import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

import FieldValue from '../components/FieldValue';
import type { SuperAdminField } from '../types';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Button, buttonClassName } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Icon } from '../ui/Icon';
import { Field, Select, Textarea } from '../ui/Input';
import { useConsoleDictionary, useConsoleLabels } from '../ui/labels';
import { PageHeader } from '../ui/PageHeader';

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
    csrf?: string;
    actions: string[];
};

// Trường nhiều dòng (bảng con, khối lồng) chiếm cả hàng; trường ngắn xếp hai cột.
const WIDE_FIELD_TYPES = ['has_many', 'has_one', 'suspension_history_field', 'serialized_field'];

export default function ResourceShow({
    resource,
    record,
    fields,
    accountUserForm,
    mfaEnabled,
    confirmed = true,
    impersonateUrl,
    csrf,
    actions,
}: Props) {
    const label = useConsoleLabels();
    const { attribute } = useConsoleDictionary();
    const shortFields = fields.filter(field => !WIDE_FIELD_TYPES.includes(field.type));
    const wideFields = fields.filter(field => WIDE_FIELD_TYPES.includes(field.type));

    return (
        <>
            <PageHeader
                title={record.title}
                actions={
                    <>
                        {resource === 'accounts' && record.url ? (
                            <Link href={`${record.url}/overview`} className={buttonClassName({ variant: 'outline' })}>
                                <Icon name="i-lucide-layout-dashboard" />
                                {label('account_overview')}
                            </Link>
                        ) : null}
                        {resource === 'users' && !confirmed ? (
                            <Button variant="outline" onClick={() => router.post(`${record.url}/resend_confirmation`)}>
                                <Icon name="i-lucide-mail" />
                                {label('resend_confirmation')}
                            </Button>
                        ) : null}
                        {actions.includes('edit') && record.url ? (
                            <Link href={`${record.url}/edit`} className={buttonClassName()}>
                                <Icon name="i-lucide-pencil" />
                                {label('edit')}
                            </Link>
                        ) : null}
                    </>
                }
            />

            <Card>
                <CardHeader>
                    <CardTitle>{label('details')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                        {shortFields.map(field => (
                            <div key={field.name} className="min-w-0">
                                <dt className="text-xs font-medium text-console-muted-foreground" id={field.name}>
                                    {attribute(field.name, field.label)}
                                </dt>
                                <dd className="mt-1 min-w-0 break-words text-sm">
                                    <FieldValue field={field} />
                                </dd>
                            </div>
                        ))}
                        {mfaEnabled === undefined ? null : (
                            <div>
                                <dt className="text-xs font-medium text-console-muted-foreground" id="mfa_enabled">
                                    {label('mfa')}
                                </dt>
                                <dd className="mt-1">
                                    <Badge variant={mfaEnabled ? 'success' : 'secondary'}>
                                        {mfaEnabled ? label('enabled') : label('disabled')}
                                    </Badge>
                                </dd>
                            </div>
                        )}
                    </dl>
                </CardContent>
            </Card>

            {wideFields.map(field => (
                <Card key={field.name}>
                    <CardHeader>
                        <CardTitle id={field.name}>{attribute(field.name, field.label)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <FieldValue field={field} />
                    </CardContent>
                </Card>
            ))}

            {accountUserForm ? <AccountUserSection form={accountUserForm} /> : null}

            {impersonateUrl ? <ImpersonateSection url={impersonateUrl} title={record.title} csrf={csrf ?? ''} /> : null}

            {resource === 'accounts' ? (
                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle>{label('reset_cache_title')}</CardTitle>
                            <CardDescription>{label('reset_cache_description')}</CardDescription>
                        </div>
                        <Button variant="outline" onClick={() => router.post(`${record.url}/reset_cache`)}>
                            <Icon name="i-lucide-refresh-cw" />
                            {label('reset_cache')}
                        </Button>
                    </CardHeader>
                </Card>
            ) : null}
        </>
    );
}

// Đăng nhập hộ mở phiên trên trang login của app (bundle Inertia khác) — nộp
// bằng <form> gốc + target="_blank" thay vì router.post, vì router.post gắn
// header X-Inertia khiến Laravel trả JSON Inertia cho trang bên bundle kia
// thay vì HTML, và bundle superadmin không biết vẽ component của bundle đó.
const REASON_MIN_LENGTH = 10;

function ImpersonateSection({ url, title, csrf }: { url: string; title: string; csrf: string }) {
    const label = useConsoleLabels();
    const [expanded, setExpanded] = useState(false);
    const [reason, setReason] = useState('');
    const reasonTooShort = reason.trim().length < REASON_MIN_LENGTH;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{label('impersonate_title')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <Alert tone="warning">{label('impersonate_warning', { title })}</Alert>
                {expanded ? (
                    <form method="post" action={url} target="_blank" className="flex flex-col gap-4">
                        <input type="hidden" name="_token" value={csrf} />
                        <Field
                            label={label('impersonate_reason', { min: REASON_MIN_LENGTH })}
                            htmlFor="impersonate_reason"
                            required
                        >
                            <Textarea
                                id="impersonate_reason"
                                name="reason"
                                rows={3}
                                value={reason}
                                onChange={event => setReason(event.target.value)}
                            />
                        </Field>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row">
                            <Button variant="outline" onClick={() => setExpanded(false)}>
                                {label('cancel')}
                            </Button>
                            <Button type="submit" disabled={reasonTooShort}>
                                {label('impersonate_confirm')}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div>
                        <Button variant="outline" onClick={() => setExpanded(true)}>
                            <Icon name="i-lucide-venetian-mask" />
                            {label('impersonate')}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function AccountUserSection({ form }: { form: AccountUserForm }) {
    const label = useConsoleLabels();
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
        <Card>
            <CardHeader>
                <CardTitle>{label('account_users_title')}</CardTitle>
            </CardHeader>
            <CardContent>
                <form
                    className="grid items-end gap-4 sm:grid-cols-[1fr_12rem_auto]"
                    onSubmit={event => {
                        event.preventDefault();
                        post('/admin/account_users', { preserveScroll: true });
                    }}
                >
                    <Field
                        label={form.accounts ? label('account_users_account') : label('account_users_user')}
                        htmlFor="account_user_related"
                    >
                        <Select
                            id="account_user_related"
                            value={data.account_user[optionKey]}
                            onChange={event =>
                                setData('account_user', { ...data.account_user, [optionKey]: Number(event.target.value) })
                            }
                        >
                            {options.map(option => (
                                <option value={option.value} key={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label={label('account_users_role')} htmlFor="account_user_role">
                        <Select
                            id="account_user_role"
                            value={data.account_user.role}
                            onChange={event => setData('account_user', { ...data.account_user, role: event.target.value })}
                        >
                            {form.roles.map(role => (
                                <option value={role} key={role}>
                                    {role}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Button type="submit" disabled={processing}>
                        <Icon name="i-lucide-plus" />
                        {label('account_users_submit')}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
