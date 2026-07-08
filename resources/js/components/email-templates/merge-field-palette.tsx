import { Button } from '@/components/ui/button';
import { useTranslator } from '@/lib/i18n';

interface Props {
    tokens: Record<string, string>;
    onInsert: (token: string) => void;
}

/**
 * P05 — Displays available merge tokens for an email template.
 * Clicking a token calls onInsert with the formatted {token} string.
 *
 * XSS note: tokens are admin-defined keys only; clicking inserts literal
 * {token} string into the textarea — no innerHTML involved.
 */
export default function MergeFieldPalette({ tokens, onInsert }: Props) {
    const t = useTranslator();

    const entries = Object.entries(tokens);

    return (
        <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{t('email_templates.merge_fields.title')}</p>
            <p className="text-muted-foreground text-xs">{t('email_templates.merge_fields.description')}</p>

            <div className="flex flex-wrap gap-1">
                {entries.map(([key, label]) => (
                    <Button
                        key={key}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 py-1 font-mono text-xs"
                        onClick={() => onInsert(`{${key}}`)}
                        title={label}
                    >
                        {`{${key}}`}
                    </Button>
                ))}

                {/* Global tokens always available */}
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 py-1 font-mono text-xs"
                    onClick={() => onInsert('{company_name}')}
                    title={t('email_templates.merge_fields.global.company_name')}
                >
                    {'{company_name}'}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 py-1 font-mono text-xs"
                    onClick={() => onInsert('{current_date}')}
                    title={t('email_templates.merge_fields.global.current_date')}
                >
                    {'{current_date}'}
                </Button>
            </div>
        </div>
    );
}
