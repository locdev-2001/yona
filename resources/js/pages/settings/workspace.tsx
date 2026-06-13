import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface WorkspaceData {
    name: string;
    base_currency: string;
    timezone: string;
    locale: string;
    audit_retention: string;
}

interface Options {
    currencies: string[];
    timezones: string[];
    locales: string[];
    retentions: string[];
}

export default function WorkspaceSettings({ workspace, options }: { workspace: WorkspaceData; options: Options }) {
    const t = useTranslator();
    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm<WorkspaceData>({ ...workspace });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('workspace.update'), { preserveScroll: true });
    };

    const breadcrumbs: BreadcrumbItem[] = [{ title: t('platform.workspace.settings_title'), href: '/settings/workspace' }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('platform.workspace.settings_title')} />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title={t('platform.workspace.settings_title')} description={t('platform.workspace.settings_subtitle')} />

                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">{t('platform.workspace.name')}</Label>
                            <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                            <InputError message={errors.name} />
                        </div>

                        <SelectField
                            label={t('platform.workspace.base_currency')}
                            value={data.base_currency}
                            onValueChange={(value) => setData('base_currency', value)}
                            options={options.currencies}
                            error={errors.base_currency}
                        />

                        <SelectField
                            label={t('platform.workspace.timezone')}
                            value={data.timezone}
                            onValueChange={(value) => setData('timezone', value)}
                            options={options.timezones}
                            error={errors.timezone}
                        />

                        <div className="grid gap-2">
                            <Label>{t('platform.workspace.locale')}</Label>
                            <Select value={data.locale} onValueChange={(value) => setData('locale', value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {options.locales.map((code) => (
                                        <SelectItem key={code} value={code}>
                                            {t(`platform.locale.${code}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.locale} />
                        </div>

                        <SelectField
                            label={t('platform.workspace.audit_retention')}
                            value={data.audit_retention}
                            onValueChange={(value) => setData('audit_retention', value)}
                            options={options.retentions}
                            error={errors.audit_retention}
                        />

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>{t('platform.actions.save')}</Button>
                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-muted-foreground text-sm">{t('platform.workspace.saved')}</p>
                            </Transition>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}

function SelectField({
    label,
    value,
    onValueChange,
    options,
    error,
}: {
    label: string;
    value: string;
    onValueChange: (value: string) => void;
    options: string[];
    error?: string;
}) {
    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            <Select value={value} onValueChange={onValueChange}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option} value={option}>
                            {option}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <InputError message={error} />
        </div>
    );
}
