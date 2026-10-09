import { router, usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import { buildPortalURL } from '../helper/portalHelper';
import { fetchCategories, fetchPortalMeta, fetchPortals, setSwitchingPortal, useHelpCenterState } from '../store';
import type { Portal } from '../types';
import type { DashboardPageProps } from '../../types';

// Port từ components-next/HelpCenter/PortalSwitcher/PortalSwitcher.vue.
interface PortalSwitcherProps {
    currentPortalSlug?: string;
    className?: string;
    onClose: () => void;
    onCreatePortal: () => void;
}

export default function PortalSwitcher({
    currentPortalSlug,
    className = '',
    onClose,
    onCreatePortal,
}: PortalSwitcherProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const { portals } = useHelpCenterState();

    const isPortalActive = (portal: Portal) => portal.slug === currentPortalSlug;

    const handlePortalChange = async (portal: Portal) => {
        if (isPortalActive(portal)) return;

        const slug = portal.slug;
        const defaultLocale = portal.meta.default_locale;
        onClose();

        setSwitchingPortal(true);
        await fetchPortals(accountId);
        await fetchPortalMeta(accountId, slug, defaultLocale);
        await fetchCategories(accountId, slug, defaultLocale);
        setSwitchingPortal(false);

        router.visit(`/app/accounts/${accountId}/portals/${slug}/${defaultLocale}/articles`);
    };

    return (
        <div
            className={`pt-5 overlay-surface z-50 absolute w-[27.5rem] max-h-96 rounded-xl flex flex-col gap-4 ${className}`.trim()}
        >
            <div className="flex items-center justify-between gap-4 px-6 pb-3">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <h2
                            className="text-base font-medium cursor-pointer text-n-slate-12 w-fit hover:underline"
                            onClick={() => router.visit(`/app/accounts/${accountId}/portals/portals_articles_index`)}
                        >
                            {t('HELP_CENTER.PORTAL_SWITCHER.PORTALS')}
                        </h2>
                        <Button
                            icon="i-lucide-arrow-up-right"
                            variant="ghost"
                            color="slate"
                            size="sm"
                            className="!w-6 !h-6 hover:bg-n-slate-2 text-n-slate-11 !p-0.5 rounded-md"
                            onClick={() => window.open(buildPortalURL(currentPortalSlug ?? ''), '_blank')}
                        />
                    </div>
                    <p className="text-sm text-n-slate-11">{t('HELP_CENTER.PORTAL_SWITCHER.CREATE_PORTAL')}</p>
                </div>
                <Button
                    label={t('HELP_CENTER.PORTAL_SWITCHER.NEW_PORTAL')}
                    color="slate"
                    icon="i-lucide-plus"
                    size="sm"
                    className="!bg-n-alpha-2 hover:!bg-n-alpha-3"
                    onClick={() => {
                        onCreatePortal();
                        onClose();
                    }}
                />
            </div>
            {portals.length > 0 ? (
                <div className="flex flex-col flex-1 min-h-0 gap-2 px-4 pb-3 overflow-y-auto overscroll-contain">
                    {portals.map(portal => (
                        <Button
                            key={portal.slug}
                            label={portal.name}
                            variant="ghost"
                            color="slate"
                            trailingIcon
                            icon={isPortalActive(portal) ? 'i-lucide-check' : ''}
                            className="!justify-end !px-2 !py-2 hover:!bg-n-alpha-2 [&>.i-lucide-check]:text-n-teal-10 h-9"
                            size="sm"
                            onClick={() => handlePortalChange(portal)}
                        >
                            {portal.custom_domain ? (
                                <div className="flex items-center gap-1">
                                    <span className="i-lucide-link size-3" />
                                    <span className="text-sm truncate text-n-slate-11">{portal.custom_domain}</span>
                                </div>
                            ) : null}
                            <span className="text-sm font-medium truncate text-n-slate-12">{portal.name || ''}</span>
                            <Avatar
                                name={portal.name}
                                src={portal.logo?.file_url || ''}
                                size={20}
                                iconName="i-lucide-building-2"
                            />
                        </Button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
