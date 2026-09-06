import { useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { getJson } from 'dashboard/helper/apiClient';
import Button from 'dashboard/components-next/button/Button';
import ComboBox from 'dashboard/components-next/combobox/ComboBox';
import IntegrationCard from 'dashboard/components-next/integration-card/IntegrationCard';
import Input from 'dashboard/components-next/input/Input';
import { portalUiFlagsIn, useHelpCenterState } from '../store';
import type { Portal } from '../types';
import type { DashboardPageProps } from '../../types';

// Port từ components-next/HelpCenter/Pages/PortalSettingsPage/PortalIntegrationsSettings.vue.
// Khoá và khuôn dạng khớp Portal::ANALYTICS_CONFIG_FORMATS; chỉ admin thấy vì
// đây là script theo dõi nhúng vào trang công khai (backend cũng chặn).
const ANALYTICS_PROVIDERS = [
    { key: 'gtm_container_id', i18nKey: 'GTM', icon: 'i-logos-google-tag-manager', format: /^GTM-[A-Z0-9]+$/ },
    { key: 'ga4_measurement_id', i18nKey: 'GA4', icon: 'i-logos-google-analytics', format: /^G-[A-Z0-9]+$/ },
    { key: 'hotjar_site_id', i18nKey: 'HOTJAR', icon: 'i-logos-hotjar-icon', format: /^\d+$/ },
    { key: 'plausible_domain', i18nKey: 'PLAUSIBLE', icon: 'i-woot-plausible', format: /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i },
    { key: 'amplitude_api_key', i18nKey: 'AMPLITUDE', icon: 'i-logos-amplitude-icon', format: /^[a-z0-9]+$/i },
    { key: 'clarity_project_id', i18nKey: 'CLARITY', icon: 'i-woot-microsoft-clarity', format: /^[a-z0-9]+$/i },
    { key: 'meta_pixel_id', i18nKey: 'META_PIXEL', icon: 'i-logos-meta-icon', format: /^\d+$/ },
];

interface InboxOption {
    id: number;
    name: string;
    channel_type: string;
}

interface PortalIntegrationsSettingsProps {
    activePortal: Portal;
    isFetching?: boolean;
    onUpdatePortalConfiguration: (portal: Record<string, unknown>) => void;
}

export default function PortalIntegrationsSettings({
    activePortal,
    isFetching = false,
    onUpdatePortalConfiguration,
}: PortalIntegrationsSettingsProps) {
    const { currentAccount, currentAccountUser } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const isAdmin = currentAccountUser?.role === 'administrator';
    useHelpCenterState();

    const [inboxes, setInboxes] = useState<InboxOption[]>([]);
    const [liveChatWidgetInboxId, setLiveChatWidgetInboxId] = useState('');
    const [analytics, setAnalytics] = useState<Record<string, string>>({});
    const [original, setOriginal] = useState<{ inboxId: string; analytics: Record<string, string> }>({
        inboxId: '',
        analytics: {},
    });

    useEffect(() => {
        void getJson<{ payload: InboxOption[] }>(`/api/v1/accounts/${accountId}/inboxes`).then(data =>
            setInboxes(data.payload ?? []),
        );
    }, [accountId]);

    useEffect(() => {
        const nextInboxId = activePortal?.inbox?.id ? String(activePortal.inbox.id) : '';
        const nextAnalytics = ANALYTICS_PROVIDERS.reduce<Record<string, string>>((accumulator, { key }) => {
            accumulator[key] = activePortal?.config?.analytics?.[key] || '';

            return accumulator;
        }, {});

        setLiveChatWidgetInboxId(nextInboxId);
        setAnalytics(nextAnalytics);
        setOriginal({ inboxId: nextInboxId, analytics: nextAnalytics });
    }, [activePortal]);

    const isUpdatingPortal = Boolean(portalUiFlagsIn(activePortal?.slug).isUpdating);

    const liveChatWidgets = useMemo(
        () => [
            { value: '', label: t('HELP_CENTER.PORTAL_SETTINGS.INTEGRATIONS.LIVE_CHAT.NONE_OPTION') },
            ...inboxes
                .filter(inbox => inbox.channel_type === 'Channel::WebWidget')
                .map(inbox => ({ value: String(inbox.id), label: inbox.name })),
        ],
        [inboxes],
    );

    const trimmedAnalytics = ANALYTICS_PROVIDERS.reduce<Record<string, string>>((accumulator, { key }) => {
        accumulator[key] = (analytics[key] ?? '').trim();

        return accumulator;
    }, {});

    const invalidAnalyticsKeys = ANALYTICS_PROVIDERS.filter(
        ({ key, format }) => trimmedAnalytics[key] !== '' && !format.test(trimmedAnalytics[key]),
    ).map(({ key }) => key);

    const hasChanges =
        liveChatWidgetInboxId !== original.inboxId ||
        ANALYTICS_PROVIDERS.some(({ key }) => trimmedAnalytics[key] !== original.analytics[key]);

    return (
        <div className="flex flex-col w-full gap-6">
            <div className="flex flex-col gap-2">
                <h6 className="text-base font-medium text-n-slate-12">
                    {t('HELP_CENTER.PORTAL_SETTINGS.INTEGRATIONS.HEADER')}
                </h6>
                <span className="text-sm text-n-slate-11">
                    {t('HELP_CENTER.PORTAL_SETTINGS.INTEGRATIONS.DESCRIPTION')}
                </span>
            </div>

            <IntegrationCard
                icon="i-lucide-messages-square"
                title={t('HELP_CENTER.PORTAL_SETTINGS.INTEGRATIONS.LIVE_CHAT.TITLE')}
                description={t('HELP_CENTER.PORTAL_SETTINGS.INTEGRATIONS.LIVE_CHAT.DESCRIPTION')}
            >
                <ComboBox
                    value={liveChatWidgetInboxId}
                    options={liveChatWidgets}
                    placeholder={t('HELP_CENTER.PORTAL_SETTINGS.INTEGRATIONS.LIVE_CHAT.PLACEHOLDER')}
                    className="[&>div>button:not(.focused)]:!outline-n-weak"
                    onChange={setLiveChatWidgetInboxId}
                />
            </IntegrationCard>

            {isAdmin
                ? ANALYTICS_PROVIDERS.map(provider => {
                      const isInvalid = invalidAnalyticsKeys.includes(provider.key);

                      return (
                          <IntegrationCard
                              key={provider.key}
                              icon={provider.icon}
                              title={t(`HELP_CENTER.PORTAL_SETTINGS.INTEGRATIONS.${provider.i18nKey}.TITLE`)}
                              description={t(
                                  `HELP_CENTER.PORTAL_SETTINGS.INTEGRATIONS.${provider.i18nKey}.DESCRIPTION`,
                              )}
                          >
                              <Input
                                  value={analytics[provider.key] ?? ''}
                                  placeholder={t(
                                      `HELP_CENTER.PORTAL_SETTINGS.INTEGRATIONS.${provider.i18nKey}.PLACEHOLDER`,
                                  )}
                                  message={t(
                                      `HELP_CENTER.PORTAL_SETTINGS.INTEGRATIONS.${provider.i18nKey}.${isInvalid ? 'INVALID' : 'HELP'}`,
                                  )}
                                  messageType={isInvalid ? 'error' : 'info'}
                                  onChange={event =>
                                      setAnalytics(current => ({ ...current, [provider.key]: event.target.value }))
                                  }
                              />
                          </IntegrationCard>
                      );
                  })
                : null}

            <div className="flex justify-end">
                <Button
                    label={t('HELP_CENTER.PORTAL_SETTINGS.INTEGRATIONS.SAVE')}
                    disabled={!hasChanges || invalidAnalyticsKeys.length > 0 || isFetching || isUpdatingPortal}
                    isLoading={isUpdatingPortal}
                    onClick={() =>
                        onUpdatePortalConfiguration({
                            id: activePortal.id,
                            slug: activePortal.slug,
                            inbox_id: liveChatWidgetInboxId,
                            config: {
                                analytics: Object.fromEntries(
                                    Object.entries(trimmedAnalytics).filter(([, value]) => value),
                                ),
                            },
                        })
                    }
                />
            </div>
        </div>
    );
}
