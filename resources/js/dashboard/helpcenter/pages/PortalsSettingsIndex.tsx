import { router, usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import Dashboard from '../../Dashboard';
import PortalSettings from '../components/PortalSettings';
import { portalsApi } from '../api';
import {
    deletePortal,
    fetchCategories,
    fetchPortalMeta,
    fetchPortals,
    getHelpCenterState,
    updatePortal,
    useHelpCenterState,
} from '../store';
import { useHelpCenterPage } from './usePortalPage';
import type { Portal } from '../types';
import type { DashboardPageProps } from '../../types';

// Port từ routes/dashboard/helpcenter/pages/PortalsSettingsIndexPage.vue.
export default function PortalsSettingsIndex({ portalSlug }: { portalSlug: string }) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    useHelpCenterPage(portalSlug);
    const { portals, portalUiFlags } = useHelpCenterState();

    const updatePortalSettings = async (portalObj: Record<string, unknown>) => {
        try {
            await updatePortal(accountId, portalSlug, portalObj);
            useAlert(t('HELP_CENTER.PORTAL_SETTINGS.API.UPDATE_PORTAL.SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('HELP_CENTER.PORTAL_SETTINGS.API.UPDATE_PORTAL.ERROR_MESSAGE'));
        }
    };

    const handleDeletePortal = async (portal: Portal) => {
        try {
            await deletePortal(accountId, portal.slug);
            await fetchPortals(accountId);
            const nextPortal = getHelpCenterState().portals.find(item => item.slug !== portal.slug) ?? null;

            if (nextPortal) {
                const defaultLocale = nextPortal.meta.default_locale;
                await fetchPortalMeta(accountId, nextPortal.slug, defaultLocale);
                await fetchCategories(accountId, nextPortal.slug, defaultLocale);
                router.visit(`/app/accounts/${accountId}/portals/${nextPortal.slug}/${defaultLocale}/articles`);
            } else {
                router.visit(`/app/accounts/${accountId}/portals/new`);
            }

            useAlert(t('HELP_CENTER.PORTAL.PORTAL_SETTINGS.DELETE_PORTAL.API.DELETE_SUCCESS'));
        } catch (error) {
            useAlert(
                parseApiErrorMessage(error) ||
                    t('HELP_CENTER.PORTAL.PORTAL_SETTINGS.DELETE_PORTAL.API.DELETE_ERROR'),
            );
        }
    };

    const handleSendCnameInstructions = async ({ portalSlug: slug, email }: { portalSlug: string; email: string }) => {
        try {
            await portalsApi.sendCnameInstructions(accountId, slug, email);
            useAlert(t('HELP_CENTER.PORTAL.PORTAL_SETTINGS.SEND_CNAME_INSTRUCTIONS.API.SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(
                parseApiErrorMessage(error) ||
                    t('HELP_CENTER.PORTAL.PORTAL_SETTINGS.SEND_CNAME_INSTRUCTIONS.API.ERROR_MESSAGE'),
            );
        }
    };

    return (
        <Dashboard>
            <PortalSettings
                portals={portals}
                isFetching={portalUiFlags.isFetching}
                portalSlug={portalSlug}
                onUpdatePortal={updatePortalSettings}
                onUpdatePortalConfiguration={updatePortalSettings}
                onDeletePortal={handleDeletePortal}
                onSendCnameInstructions={handleSendCnameInstructions}
            />
        </Dashboard>
    );
}
