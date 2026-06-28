import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTranslator } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { NavItem, SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslator();
    const { auth } = usePage<SharedData>().props;
    const can = (permission: string) => auth.membership?.permissions.includes(permission) ?? false;
    const currentPath = window.location.pathname;

    const navItems: NavItem[] = [
        { title: t('platform.nav.profile'), url: '/settings/profile' },
        { title: t('platform.nav.password'), url: '/settings/password' },
        { title: t('platform.nav.appearance'), url: '/settings/appearance' },
        ...(can('tenant.workspace.update') ? [{ title: t('platform.nav.workspace'), url: '/settings/workspace' }] : []),
        ...(can('tenant.team.manage') ? [{ title: t('platform.nav.teams'), url: '/settings/teams' }] : []),
        ...(can('tenant.member.manage') ? [{ title: t('platform.nav.members'), url: '/settings/members' }] : []),
        ...(can('tenant.zalo.manage') ? [{ title: t('platform.nav.zalo'), url: '/settings/zalo-connections' }] : []),
        ...(can('tenant.email_template.view') ? [{ title: t('email_templates.title'), url: '/settings/email-templates' }] : []),
        ...(can('tenant.workspace.update')
            ? [
                  { title: t('platform.nav.pipelines'), url: '/settings/lookups/pipelines' },
                  { title: t('platform.nav.lead_sources'), url: '/settings/lookups/lead-sources' },
                  { title: t('platform.nav.project_statuses'), url: '/settings/lookups/project-statuses' },
              ]
            : []),
        ...(can('custom_fields.view') || can('custom_fields.manage')
            ? [{ title: t('platform.nav.custom_fields'), url: '/settings/custom-fields' }]
            : []),
        ...(can('tenant.client.view') ? [{ title: t('platform.nav.client_groups'), url: '/client-groups' }] : []),
    ];

    return (
        <div className="px-4 py-6">
            <Heading title={t('platform.nav.settings')} description={t('platform.settings.subtitle')} />

            <div className="flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav className="flex flex-col space-y-1 space-x-0">
                        {navItems.map((item) => (
                            <Button
                                key={item.url}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start', {
                                    'bg-muted': currentPath === item.url,
                                })}
                            >
                                <Link href={item.url} prefetch>
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 md:hidden" />

                <div className="flex-1 md:max-w-2xl">
                    <section className="max-w-xl space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
}
