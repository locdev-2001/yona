import MergeFieldPalette from '@/components/email-templates/merge-field-palette';
import TemplatePreview from '@/components/email-templates/template-preview';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { useRef, type FormEventHandler } from 'react';

interface EmailTemplateData {
    id: string;
    slug: string;
    type: string;
    name: string;
    subject: string;
    body: string;
    language: string;
    plaintext: boolean;
    active: boolean;
    sort_order: number;
}

interface Props {
    template: EmailTemplateData;
    mergeTokens: Record<string, string>;
}

/**
 * P05 — Settings → Email Templates edit page.
 * Admin can edit: name, subject, body, plaintext, active, sort_order.
 * slug / type / language are server-controlled (read-only display).
 */
export default function EmailTemplateEdit({ template, mergeTokens }: Props) {
    const t = useTranslator();
    const bodyRef = useRef<HTMLTextAreaElement>(null);

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: template.name,
        subject: template.subject,
        body: template.body,
        plaintext: template.plaintext,
        active: template.active,
        sort_order: template.sort_order,
    });

    const {
        data: testData,
        setData: setTestData,
        post: postTest,
        processing: testProcessing,
    } = useForm({
        email: '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('email_templates.title'), href: '/settings/email-templates' },
        { title: template.name, href: `/settings/email-templates/${template.id}` },
    ];

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('email-templates.update', template.id), { preserveScroll: true });
    };

    const submitTest: FormEventHandler = (e) => {
        e.preventDefault();
        postTest(route('email-templates.test', template.id), { preserveScroll: true });
    };

    const insertToken = (token: string) => {
        const el = bodyRef.current;
        if (!el) return;

        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const newValue = el.value.slice(0, start) + token + el.value.slice(end);

        setData('body', newValue);

        // Restore cursor position after React re-render.
        requestAnimationFrame(() => {
            el.setSelectionRange(start + token.length, start + token.length);
            el.focus();
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={template.name} />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title={template.name} description={`${template.slug} · ${template.language.toUpperCase()}`} />

                    <form onSubmit={submit} className="space-y-4">
                        {/* Name */}
                        <div className="grid gap-2">
                            <Label htmlFor="name">{t('email_templates.form.name')}</Label>
                            <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                            <InputError message={errors.name} />
                        </div>

                        {/* Subject */}
                        <div className="grid gap-2">
                            <Label htmlFor="subject">{t('email_templates.form.subject')}</Label>
                            <Input id="subject" value={data.subject} onChange={(e) => setData('subject', e.target.value)} required />
                            <InputError message={errors.subject} />
                        </div>

                        {/* Merge-field palette (click inserts into body) */}
                        <MergeFieldPalette tokens={mergeTokens} onInsert={insertToken} />

                        {/* Body */}
                        <div className="grid gap-2">
                            <Label htmlFor="body">{t('email_templates.form.body')}</Label>
                            <Textarea
                                id="body"
                                ref={bodyRef}
                                value={data.body}
                                onChange={(e) => setData('body', e.target.value)}
                                rows={12}
                                className="font-mono text-sm"
                                required
                            />
                            <InputError message={errors.body} />
                        </div>

                        {/* Toggles */}
                        <div className="flex items-center gap-3">
                            <Switch id="active" checked={data.active} onCheckedChange={(checked) => setData('active', checked)} />
                            <Label htmlFor="active">{t('email_templates.form.active')}</Label>
                        </div>

                        <div className="flex items-center gap-3">
                            <Switch id="plaintext" checked={data.plaintext} onCheckedChange={(checked) => setData('plaintext', checked)} />
                            <Label htmlFor="plaintext">{t('email_templates.form.plaintext')}</Label>
                        </div>

                        {/* Save */}
                        <div className="flex items-center gap-4">
                            <Button type="submit" disabled={processing}>
                                {t('email_templates.actions.save')}
                            </Button>
                            {recentlySuccessful && <p className="text-muted-foreground text-sm">{t('email_templates.updated')}</p>}
                        </div>
                    </form>

                    <Separator />

                    {/* Preview */}
                    <TemplatePreview subject={data.subject} body={data.body} />

                    <Separator />

                    {/* Send test */}
                    <form onSubmit={submitTest} className="space-y-3">
                        <p className="text-sm font-medium">{t('email_templates.actions.test_send')}</p>
                        <div className="flex items-end gap-2">
                            <div className="grid flex-1 gap-1">
                                <Label htmlFor="test_email">{t('email_templates.form.test_email')}</Label>
                                <Input
                                    id="test_email"
                                    type="email"
                                    value={testData.email}
                                    onChange={(e) => setTestData('email', e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" variant="outline" disabled={testProcessing}>
                                {t('email_templates.actions.test_send')}
                            </Button>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
