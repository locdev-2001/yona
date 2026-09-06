import { useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import BaseSettingsHeader from '../BaseSettingsHeader';
import Button from 'dashboard/components-next/button/Button';
import BaseTable from 'dashboard/components-next/table/BaseTable';
import BaseTableRow from 'dashboard/components-next/table/BaseTableRow';
import BaseTableCell from 'dashboard/components-next/table/BaseTableCell';
import type { IntegrationApp, IntegrationHook } from 'dashboard/composables/useIntegrationApps';
import type { SharedPageProps } from '../../../types';

// Port từ dashboard/routes/dashboard/settings/integrations/MultipleIntegrationHooks.vue.
interface MultipleIntegrationHooksProps {
    integration: IntegrationApp;
    showAddButton: boolean;
    onAdd: () => void;
    onDelete: (hook: IntegrationHook) => void;
}

interface HookRow extends IntegrationHook {
    properties: string[];
}

export default function MultipleIntegrationHooks({
    integration,
    showAddButton,
    onAdd,
    onDelete,
}: MultipleIntegrationHooksProps) {
    const { globalConfig } = usePage<SharedPageProps>().props;
    const [searchQuery, setSearchQuery] = useState('');

    const isHookTypeInbox = integration.hook_type === 'inbox';
    const hasConnectedHooks = Boolean(integration.hooks?.length);

    const hookHeaders = useMemo(() => {
        const headers: string[] = [...(integration.visible_properties || [])];
        if (isHookTypeInbox) headers.push(t('INTEGRATION_APPS.LIST.INBOX'));
        headers.push(t('INTEGRATION_APPS.LIST.ACTIONS'));
        return headers;
    }, [integration.visible_properties, isHookTypeInbox]);

    const hooks: HookRow[] = useMemo(() => {
        if (!hasConnectedHooks) return [];
        const visibleProperties = integration.visible_properties || [];
        return integration.hooks.map(hook => ({
            ...hook,
            properties: visibleProperties.map(property => {
                const value = hook.settings?.[property];
                return value ? String(value) : '--';
            }),
        }));
    }, [hasConnectedHooks, integration.hooks, integration.visible_properties]);

    const filteredHooks = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return hooks;
        return hooks.filter(hook => hook.properties.some(property => property.toLowerCase().includes(query)));
    }, [hooks, searchQuery]);

    return (
        <div className="flex flex-col flex-1 gap-4 overflow-auto">
            <BaseSettingsHeader
                title={integration.name || ''}
                description={t(`INTEGRATION_APPS.SIDEBAR_DESCRIPTION.${(integration.name || '').toUpperCase()}`, {
                    installationName: globalConfig.installationName,
                })}
                featureName={integration.id}
                backButtonLabel={t('INTEGRATION_SETTINGS.HEADER')}
                searchPlaceholder={t('INTEGRATION_APPS.SEARCH_PLACEHOLDER')}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                count={
                    hooks.length ? (
                        <span className="text-body-main text-n-slate-11">
                            {t('INTEGRATION_APPS.COUNT', { n: hooks.length })}
                        </span>
                    ) : null
                }
                actions={
                    showAddButton ? (
                        <Button label={t('INTEGRATION_APPS.ADD_BUTTON')} size="sm" onClick={onAdd} />
                    ) : null
                }
            />
            <div className="w-full">
                {hasConnectedHooks ? (
                    <BaseTable
                        headers={hookHeaders}
                        hasItems={filteredHooks.length > 0}
                        noDataMessage={searchQuery ? t('INTEGRATION_APPS.NO_RESULTS') : ''}
                    >
                        {filteredHooks.map(hook => (
                            <BaseTableRow key={hook.id}>
                                {hook.properties.map(property => (
                                    <BaseTableCell key={property}>
                                        <span className="text-body-main text-n-slate-12">{property}</span>
                                    </BaseTableCell>
                                ))}

                                {isHookTypeInbox ? (
                                    <BaseTableCell>
                                        <span className="text-body-main text-n-slate-11 break-words">
                                            {hook.inbox ? hook.inbox.name : ''}
                                        </span>
                                    </BaseTableCell>
                                ) : null}

                                <BaseTableCell align="end" className="w-12">
                                    <div className="flex justify-end gap-3 flex-shrink-0">
                                        <Button
                                            title={t('INTEGRATION_APPS.LIST.DELETE.BUTTON_TEXT')}
                                            icon="i-woot-bin"
                                            slate
                                            sm
                                            className="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
                                            onClick={() => onDelete(hook)}
                                        />
                                    </div>
                                </BaseTableCell>
                            </BaseTableRow>
                        ))}
                    </BaseTable>
                ) : (
                    <p className="flex flex-col items-center justify-center h-full">
                        {t('INTEGRATION_APPS.NO_HOOK_CONFIGURED', { integrationId: integration.id })}
                    </p>
                )}
            </div>
        </div>
    );
}
