import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { HashIcon, LayoutDashboardIcon, MailIcon, PencilIcon, PlusIcon, RefreshCwIcon, VenetianMaskIcon } from 'lucide-react';

import Link from '@admin/components/Link';
import { Alert, AlertDescription } from '@admin/components/ui/alert';
import { Button, buttonVariants } from '@admin/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@admin/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@admin/components/ui/select';
import { Textarea } from '@admin/components/ui/textarea';
import { cn } from '@admin/lib/utils';
import type { RecordDetailRow, RecordStat } from '@admin/views/apps/resources/view/record-view-left-panel';
import { formatCompactNumber, RecordViewLeftPanel } from '@admin/views/apps/resources/view/record-view-left-panel';
import { SectionCard, TableCard } from '@admin/views/apps/resources/view/section-card';

import FieldValue from '../components/FieldValue';
import { useNavLabel } from '../components/navigation';
import { useConsoleDictionary, useConsoleLabels } from '../labels';
import type { HasManyValue, SuperAdminField } from '../types';

type AccountUserForm = {
    accountId?: number;
    userId?: number;
    accounts?: { value: number; label: string }[];
    users?: { value: number; label: string }[];
    roles: string[];
};

type Props = {
    resource: string;
    resourceLabel?: string;
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

// Trường nhiều dòng (bảng con, khối lồng) nằm ở cột phải; trường ngắn là danh sách chi tiết ở cột trái.
const WIDE_FIELD_TYPES = ['has_many', 'has_one', 'suspension_history_field', 'serialized_field'];
const STAT_FIELD_TYPES = ['count_field'];

export default function ResourceShow({
    resource,
    resourceLabel,
    singularLabel,
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
    const resourceTitle = useNavLabel(`/admin/${resource}`, resourceLabel ?? singularLabel);
    const avatar = fields.find(field => field.type === 'avatar_field');
    // Hai ô số liệu chỉ hiện khi đủ cặp; lẻ một thì để trong danh sách chi tiết.
    const countFields = fields.filter(field => STAT_FIELD_TYPES.includes(field.type));
    const statFields = countFields.length >= 2 ? countFields.slice(0, 2) : [];
    const shortFields = fields.filter(
        field => !WIDE_FIELD_TYPES.includes(field.type) && field.type !== 'avatar_field' && !statFields.includes(field),
    );
    const wideFields = fields.filter(field => WIDE_FIELD_TYPES.includes(field.type));

    const stats: RecordStat[] = statFields.map(field => ({
        key: field.name,
        icon: <HashIcon />,
        value: formatCompactNumber(typeof field.value === 'number' ? field.value : Number(field.value ?? 0)),
        label: attribute(field.name, field.label),
    }));

    const details: RecordDetailRow[] = shortFields.map(field => ({
        key: field.name,
        label: attribute(field.name, field.label),
        value: <FieldValue field={field} />,
        stacked: field.type === 'string' && String(field.value ?? '').length > 32,
    }));

    if (mfaEnabled !== undefined) {
        details.push({
            key: 'mfa_enabled',
            label: label('mfa'),
            value: mfaEnabled ? label('enabled') : label('disabled'),
            status: mfaEnabled ? 'active' : 'inactive',
        });
    }

    const canEdit = actions.includes('edit') && record.url;
    const panelActions =
        canEdit || (resource === 'accounts' && record.url) ? (
            <>
                {canEdit ? (
                    <Link href={`${record.url}/edit`} className={cn(buttonVariants(), 'sm:flex-1')}>
                        <PencilIcon />
                        {label('edit')}
                    </Link>
                ) : null}
                {resource === 'accounts' && record.url ? (
                    <Link href={`${record.url}/overview`} className={cn(buttonVariants({ variant: 'outline' }), 'sm:flex-1')}>
                        <LayoutDashboardIcon />
                        {label('account_overview')}
                    </Link>
                ) : null}
            </>
        ) : null;

    const hasRightColumn =
        wideFields.length > 0 || Boolean(accountUserForm) || Boolean(impersonateUrl) || resource === 'accounts';

    return (
        <div
            className={cn(
                'relative grid grid-cols-1 gap-6',
                hasRightColumn ? 'lg:grid-cols-[350px_minmax(0,1fr)]' : 'max-w-xl',
            )}
        >
            <RecordViewLeftPanel
                title={record.title}
                avatarUrl={avatar?.value ? String(avatar.value) : null}
                badge={resourceTitle}
                stats={stats}
                detailsTitle={label('details')}
                details={details}
                actions={panelActions}
                footer={
                    resource === 'users' && !confirmed ? (
                        <Button variant="outline" className="w-full" onClick={() => router.post(`${record.url}/resend_confirmation`)}>
                            <MailIcon />
                            {label('resend_confirmation')}
                        </Button>
                    ) : null
                }
            />

            {hasRightColumn ? (
                <div className="flex min-w-0 flex-col gap-6">
                    {wideFields.map(field =>
                        field.type === 'has_many' && !(field.value as HasManyValue | null)?.rows?.length ? (
                            <SectionCard key={field.name} id={field.name} title={attribute(field.name, field.label)}>
                                <p className="text-muted-foreground text-sm">{label('no_records')}</p>
                            </SectionCard>
                        ) : field.type === 'has_many' ? (
                            <TableCard key={field.name} id={field.name} title={attribute(field.name, field.label)}>
                                <FieldValue field={field} />
                            </TableCard>
                        ) : (
                            <SectionCard key={field.name} id={field.name} title={attribute(field.name, field.label)}>
                                <FieldValue field={field} />
                            </SectionCard>
                        ),
                    )}

                    {accountUserForm ? <AccountUserSection form={accountUserForm} /> : null}

                    {impersonateUrl ? <ImpersonateSection url={impersonateUrl} title={record.title} csrf={csrf ?? ''} /> : null}

                    {resource === 'accounts' ? (
                        <SectionCard
                            title={label('reset_cache_title')}
                            description={label('reset_cache_description')}
                            action={
                                <Button variant="outline" onClick={() => router.post(`${record.url}/reset_cache`)}>
                                    <RefreshCwIcon />
                                    {label('reset_cache')}
                                </Button>
                            }
                        />
                    ) : null}
                </div>
            ) : null}
        </div>
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
        <SectionCard
            title={label('impersonate_title')}
            action={
                expanded ? null : (
                    <Button variant="outline" onClick={() => setExpanded(true)}>
                        <VenetianMaskIcon />
                        {label('impersonate')}
                    </Button>
                )
            }
        >
            <Alert>
                <AlertDescription>{label('impersonate_warning', { title })}</AlertDescription>
            </Alert>
            {expanded ? (
                <form method="post" action={url} target="_blank" className="flex flex-col gap-4">
                    <input type="hidden" name="_token" value={csrf} />
                    <Field className="gap-2">
                        <FieldLabel htmlFor="impersonate_reason">{label('impersonate_reason', { min: REASON_MIN_LENGTH })}</FieldLabel>
                        <Textarea
                            id="impersonate_reason"
                            name="reason"
                            rows={3}
                            required
                            value={reason}
                            onChange={event => setReason(event.target.value)}
                        />
                    </Field>
                    <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
                        <Button variant="outline" onClick={() => setExpanded(false)}>
                            {label('cancel')}
                        </Button>
                        <Button type="submit" disabled={reasonTooShort}>
                            {label('impersonate_confirm')}
                        </Button>
                    </div>
                </form>
            ) : null}
        </SectionCard>
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

    const options = (form.accounts ?? form.users ?? []).map(option => ({ value: String(option.value), label: option.label }));
    const roles = form.roles.map(role => ({ value: role, label: role }));
    const optionKey = form.accounts ? 'account_id' : 'user_id';

    return (
        <SectionCard title={label('account_users_title')}>
            <form
                onSubmit={event => {
                    event.preventDefault();
                    post('/admin/account_users', { preserveScroll: true });
                }}
            >
                <FieldGroup className="grid grid-cols-1 items-end gap-6 sm:grid-cols-[1fr_12rem_auto]">
                    <Field className="gap-2">
                        <FieldLabel htmlFor="account_user_related">
                            {form.accounts ? label('account_users_account') : label('account_users_user')}
                        </FieldLabel>
                        <Select
                            items={options}
                            value={String(data.account_user[optionKey])}
                            onValueChange={(value: string | null) => {
                                if (value) setData('account_user', { ...data.account_user, [optionKey]: Number(value) });
                            }}
                        >
                            <SelectTrigger id="account_user_related" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent alignItemWithTrigger={false}>
                                <SelectGroup>
                                    {options.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field className="gap-2">
                        <FieldLabel htmlFor="account_user_role">{label('account_users_role')}</FieldLabel>
                        <Select
                            items={roles}
                            value={data.account_user.role}
                            onValueChange={(value: string | null) => {
                                if (value) setData('account_user', { ...data.account_user, role: value });
                            }}
                        >
                            <SelectTrigger id="account_user_role" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent alignItemWithTrigger={false}>
                                <SelectGroup>
                                    {roles.map(role => (
                                        <SelectItem key={role.value} value={role.value}>
                                            {role.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                    <Button type="submit" disabled={processing}>
                        <PlusIcon />
                        {label('account_users_submit')}
                    </Button>
                </FieldGroup>
            </form>
        </SectionCard>
    );
}
