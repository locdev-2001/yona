import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminLayout from '@/layouts/admin/layout';
import { useTranslator } from '@/lib/i18n';
import { Head, router } from '@inertiajs/react';

interface MemberRow {
    id: string;
    user_id: number;
    name: string;
    email: string;
    role: string;
    status: string;
}

interface WorkspaceInfo {
    id: string;
    name: string;
    slug: string;
    status: string;
    base_currency: string;
    timezone: string;
}

export default function AdminWorkspaceShow({ workspace, members }: { workspace: WorkspaceInfo; members: MemberRow[] }) {
    const t = useTranslator();

    const impersonate = (userId: number) => {
        router.post(`/admin/workspaces/${workspace.id}/members/${userId}/impersonate`);
    };

    return (
        <AdminLayout
            breadcrumbs={[
                { title: t('platform.admin.nav.workspaces'), href: '/admin/workspaces' },
                { title: workspace.name, href: `/admin/workspaces/${workspace.id}` },
            ]}
        >
            <Head title={workspace.name} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-semibold">{workspace.name}</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {workspace.slug} · {workspace.base_currency} · {workspace.timezone}
                    </p>
                </div>

                <div>
                    <h2 className="mb-3 text-lg font-medium">{t('platform.admin.members.title')}</h2>
                    <div className="bg-card rounded-xl border shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('platform.admin.members.name')}</TableHead>
                                    <TableHead>{t('platform.admin.members.email')}</TableHead>
                                    <TableHead>{t('platform.admin.members.role')}</TableHead>
                                    <TableHead>{t('platform.admin.members.status')}</TableHead>
                                    <TableHead className="text-right" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                                            {t('platform.admin.members.empty')}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {members.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium">{member.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{member.email}</TableCell>
                                        <TableCell>{t(`platform.roles.${member.role}`)}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{t(`platform.statuses.${member.status}`)}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={member.status !== 'active'}
                                                onClick={() => impersonate(member.user_id)}
                                            >
                                                {t('platform.admin.members.impersonate')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
