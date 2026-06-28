import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminLayout from '@/layouts/admin/layout';
import { useTranslator } from '@/lib/i18n';
import { Head, Link, router } from '@inertiajs/react';

// ---- Types ----------------------------------------------------------------

interface AnnouncementRow {
    id: string;
    title: string;
    slug: string;
    category: string | null;
    status: string | null;
    published_at: string | null;
}

// ---- Helpers ---------------------------------------------------------------

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
}

// ---- Component -------------------------------------------------------------

export default function AdminAnnouncementsIndex({ announcements }: { announcements: AnnouncementRow[] }) {
    const t = useTranslator();

    const handleDelete = (id: string) => {
        if (!window.confirm(t('platform.announcements.admin.delete_confirm'))) return;
        router.delete(`/admin/announcements/${id}`);
    };

    return (
        <AdminLayout breadcrumbs={[{ title: t('platform.announcements.admin.nav'), href: '/admin/announcements' }]}>
            <Head title={t('platform.announcements.admin.title')} />

            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">{t('platform.announcements.admin.title')}</h1>
                        <p className="text-muted-foreground mt-1 text-sm">{t('platform.announcements.admin.subtitle')}</p>
                    </div>
                    <Button asChild>
                        <Link href="/admin/announcements/create">{t('platform.announcements.admin.new')}</Link>
                    </Button>
                </div>

                <div className="bg-card rounded-xl border shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('platform.announcements.admin.col_title')}</TableHead>
                                <TableHead>{t('platform.announcements.admin.col_category')}</TableHead>
                                <TableHead>{t('platform.announcements.admin.col_status')}</TableHead>
                                <TableHead>{t('platform.announcements.admin.col_published')}</TableHead>
                                <TableHead className="text-right">{t('platform.announcements.admin.col_actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {announcements.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                                        {t('platform.announcements.admin.empty')}
                                    </TableCell>
                                </TableRow>
                            )}
                            {announcements.map((announcement) => (
                                <TableRow key={announcement.id}>
                                    <TableCell className="font-medium">
                                        <Link href={`/admin/announcements/${announcement.id}/edit`} className="hover:underline">
                                            {announcement.title}
                                        </Link>
                                        <span className="text-muted-foreground ml-2 text-xs">{announcement.slug}</span>
                                    </TableCell>
                                    <TableCell>
                                        {announcement.category && (
                                            <Badge variant="outline">{t(`platform.announcements.category.${announcement.category}`)}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {announcement.status && (
                                            <Badge variant={announcement.status === 'published' ? 'default' : 'secondary'}>
                                                {t(`platform.announcements.admin.status.${announcement.status}`)}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground tabular-nums">{formatDate(announcement.published_at)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button size="sm" variant="outline" asChild>
                                                <Link href={`/admin/announcements/${announcement.id}/edit`}>{t('platform.actions.edit')}</Link>
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(announcement.id)}
                                            >
                                                {t('platform.actions.delete')}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AdminLayout>
    );
}
