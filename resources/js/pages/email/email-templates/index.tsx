import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';

interface EmailTemplate {
    id: string;
    slug: string;
    type: string;
    name: string;
    subject: string;
    language: string;
    active: boolean;
}

interface Props {
    templates: EmailTemplate[];
    types: string[];
    languages: string[];
}

/**
 * P05 — Settings → Email Templates list.
 * Grouped by type, sortable by type + sort_order (server-side).
 */
export default function EmailTemplatesIndex({ templates, types }: Props) {
    const t = useTranslator();

    const breadcrumbs: BreadcrumbItem[] = [{ title: t('email_templates.title'), href: '/settings/email-templates' }];

    // Group templates by type for UI sections.
    const grouped = types.reduce<Record<string, EmailTemplate[]>>((acc, type) => {
        acc[type] = templates.filter((tpl) => tpl.type === type);
        return acc;
    }, {});

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('email_templates.title')} />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title={t('email_templates.title')} description={t('email_templates.subtitle')} />

                    {types.map((type) => {
                        const group = grouped[type] ?? [];
                        if (group.length === 0) return null;

                        return (
                            <div key={type} className="space-y-2">
                                <h3 className="text-sm font-semibold capitalize">{t(`email_templates.types.${type}`)}</h3>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('email_templates.columns.name')}</TableHead>
                                            <TableHead>{t('email_templates.columns.subject')}</TableHead>
                                            <TableHead>{t('email_templates.columns.language')}</TableHead>
                                            <TableHead>{t('email_templates.columns.active')}</TableHead>
                                            <TableHead className="text-right" />
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {group.map((tpl) => (
                                            <TableRow key={tpl.id}>
                                                <TableCell className="font-medium">{tpl.name}</TableCell>
                                                <TableCell className="text-muted-foreground max-w-xs truncate text-sm">{tpl.subject}</TableCell>
                                                <TableCell>
                                                    <span className="font-mono text-xs uppercase">{tpl.language}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={tpl.active ? 'default' : 'secondary'}>
                                                        {tpl.active ? t('email_templates.statuses.active') : t('email_templates.statuses.inactive')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button asChild size="sm" variant="ghost">
                                                        <Link href={route('email-templates.edit', tpl.id)}>{t('email_templates.actions.edit')}</Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        );
                    })}
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
