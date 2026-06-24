import { useTranslator } from '@/lib/i18n';

interface Props {
    subject: string;
    body: string;
}

/**
 * P05 — Renders a pre-compiled email template preview.
 *
 * XSS note: dangerouslySetInnerHTML is intentional here — this is an
 * admin-only preview of their own HTML template. The rendered body comes
 * from the admin's own input and is never shown to untrusted end-users.
 * Only admins with tenant.email_template.manage can reach this page.
 */
export default function TemplatePreview({ subject, body }: Props) {
    const t = useTranslator();

    return (
        <div className="space-y-3">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{t('email_templates.preview.title')}</p>
            <p className="text-muted-foreground text-xs">{t('email_templates.preview.notice')}</p>

            <div className="rounded-md border">
                <div className="bg-muted/50 border-b px-3 py-2">
                    <p className="text-sm font-medium">{subject || '—'}</p>
                </div>
                <div
                    className="prose prose-sm max-w-none p-3"
                    /* eslint-disable-next-line react/no-danger */
                    dangerouslySetInnerHTML={{ __html: body }}
                />
            </div>
        </div>
    );
}
