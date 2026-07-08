import { Head } from '@inertiajs/react';

import AppearanceTabs from '@/components/appearance-tabs';
import HeadingSmall from '@/components/heading-small';
import LanguageTabs from '@/components/language-tabs';
import { useTranslator } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Appearance settings',
        href: '/settings/appearance',
    },
];

export default function Appearance() {
    const t = useTranslator();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Appearance settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Appearance settings" description="Update your account's appearance settings" />
                    <AppearanceTabs />

                    <div className="space-y-2">
                        <p className="text-sm font-medium">{t('platform.locale.label')}</p>
                        <LanguageTabs />
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
