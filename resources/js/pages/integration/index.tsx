import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import type { IntegrationCard } from './components/integration-card';
import { IntegrationCardItem } from './components/integration-card';

interface Props {
    cards: IntegrationCard[];
}

export default function IntegrationsIndex({ cards }: Props) {
    const t = useTranslator();

    const breadcrumbs: BreadcrumbItem[] = [{ title: t('platform.nav.integrations'), href: '/integrations' }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('platform.nav.integrations')} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <h1 className="text-xl font-semibold">{t('platform.integrations.title')}</h1>
                    <p className="text-muted-foreground text-sm">{t('platform.integrations.subtitle')}</p>
                </div>

                {cards.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t('platform.integrations.empty')}</p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {cards.map((card) => (
                            <IntegrationCardItem key={card.key} card={card} />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
