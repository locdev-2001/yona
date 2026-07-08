import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminLayout from '@/layouts/admin/layout';
import { useTranslator } from '@/lib/i18n';
import { Head, Link } from '@inertiajs/react';

interface WorkspaceRow {
    id: string;
    name: string;
    slug: string;
    status: string;
    base_currency: string;
    created_at: string | null;
}

export default function AdminWorkspaces({ workspaces }: { workspaces: WorkspaceRow[] }) {
    const t = useTranslator();

    return (
        <AdminLayout breadcrumbs={[{ title: t('platform.admin.nav.workspaces'), href: '/admin/workspaces' }]}>
            <Head title={t('platform.admin.workspaces.title')} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-semibold">{t('platform.admin.workspaces.title')}</h1>
                    <p className="text-muted-foreground mt-1 text-sm">{t('platform.admin.workspaces.subtitle')}</p>
                </div>

                <div className="bg-card rounded-xl border shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('platform.admin.workspaces.name')}</TableHead>
                                <TableHead>{t('platform.admin.workspaces.slug')}</TableHead>
                                <TableHead>{t('platform.admin.workspaces.status')}</TableHead>
                                <TableHead>{t('platform.admin.workspaces.currency')}</TableHead>
                                <TableHead>{t('platform.admin.workspaces.created')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {workspaces.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                                        {t('platform.admin.workspaces.empty')}
                                    </TableCell>
                                </TableRow>
                            )}
                            {workspaces.map((workspace) => (
                                <TableRow key={workspace.id}>
                                    <TableCell className="font-medium">
                                        <Link href={`/admin/workspaces/${workspace.id}`} className="hover:underline">
                                            {workspace.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{workspace.slug}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{workspace.status}</Badge>
                                    </TableCell>
                                    <TableCell className="tabular-nums">{workspace.base_currency}</TableCell>
                                    <TableCell className="text-muted-foreground tabular-nums">{workspace.created_at}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AdminLayout>
    );
}
