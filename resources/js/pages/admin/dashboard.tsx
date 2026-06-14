import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/ui/stat-card';
import AdminLayout from '@/layouts/admin/layout';
import { useTranslator } from '@/lib/i18n';
import { Head } from '@inertiajs/react';
import { Building2, ShieldCheck, UserPlus, Users } from 'lucide-react';

interface AdminDashboardProps {
    stats: { workspaces: number; users: number; admins: number; signups24h: number };
}

export default function AdminDashboard({ stats }: AdminDashboardProps) {
    const t = useTranslator();

    const cards = [
        { key: 'workspaces', icon: Building2, value: stats.workspaces },
        { key: 'users', icon: Users, value: stats.users },
        { key: 'admins', icon: ShieldCheck, value: stats.admins },
        { key: 'signups_24h', icon: UserPlus, value: stats.signups24h },
    ];

    return (
        <AdminLayout breadcrumbs={[{ title: t('platform.admin.nav.dashboard'), href: '/admin/dashboard' }]}>
            <Head title={t('platform.admin.dashboard.title')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader title={t('platform.admin.dashboard.title')} description={t('platform.admin.dashboard.subtitle')} />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {cards.map((card) => (
                        <StatCard
                            key={card.key}
                            label={t(`platform.admin.dashboard.stats.${card.key}`)}
                            value={card.value.toLocaleString()}
                            icon={card.icon}
                        />
                    ))}
                </div>
            </div>
        </AdminLayout>
    );
}
