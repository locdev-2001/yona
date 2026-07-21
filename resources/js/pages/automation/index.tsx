import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, WorkflowListItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { GitBranch, Plus } from 'lucide-react';

interface Props {
    workflows: WorkflowListItem[];
}

export default function AutomationIndex({ workflows }: Props) {
    const t = useTranslator();
    const breadcrumbs: BreadcrumbItem[] = [{ title: t('automation.title.index'), href: route('automation.workflows.index') }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('automation.title.index')} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex items-start justify-between">
                    <PageHeader title={t('automation.title.index')} />
                    <Button asChild size="sm">
                        <Link href={route('automation.workflows.create')}>
                            <Plus className="mr-1 h-4 w-4" />
                            {t('automation.index.create_button')}
                        </Link>
                    </Button>
                </div>

                {workflows.length === 0 ? (
                    <div className="text-muted-foreground flex flex-col items-center gap-2 py-16">
                        <GitBranch className="h-10 w-10 opacity-30" />
                        <p className="text-sm">{t('automation.index.empty')}</p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/30 border-b text-left">
                                    <th className="px-4 py-3 font-medium">{t('automation.index.column_name')}</th>
                                    <th className="px-4 py-3 font-medium">{t('automation.index.column_status')}</th>
                                    <th className="px-4 py-3 font-medium">{t('automation.index.column_updated')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workflows.map((workflow) => (
                                    <tr key={workflow.id} className="hover:bg-muted/20 border-b last:border-0">
                                        <td className="px-4 py-3">
                                            <Link
                                                href={route('automation.workflows.show', workflow.id)}
                                                className="font-medium underline-offset-2 hover:underline"
                                            >
                                                {workflow.name}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
                                                {workflow.is_active ? t('automation.index.status_active') : t('automation.index.status_inactive')}
                                            </Badge>
                                        </td>
                                        <td className="text-muted-foreground px-4 py-3">{new Date(workflow.updated_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
