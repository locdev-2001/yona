import { useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { getJson } from 'dashboard/helper/apiClient';
import Dashboard from '../../Dashboard';
import SettingsContent from '../SettingsContent';
import SettingIntroBanner from 'dashboard/components/widgets/SettingIntroBanner';
import Tabs from 'dashboard/components/ui/Tabs';
import type { TabItem } from 'dashboard/components/ui/Tabs';
import Loader from 'shared/components/loader/Loader';
import WeeklyAvailability from './components/WeeklyAvailability';
import PreChatFormSettings from './PreChatForm/Settings';
import InboxSettingsPage from './settingsPage/InboxSettingsPage';
import CollaboratorsPage from './settingsPage/CollaboratorsPage';
import CustomerSatisfactionPage from './settingsPage/CustomerSatisfactionPage';
import ConfigurationPage from './settingsPage/ConfigurationPage';
import InboxConnectionAlert from './components/InboxConnectionAlert';
import BotConfigurationPage from './settingsPage/BotConfigurationPage';
import { confirmDiscardUnsavedChanges } from './settingsDraft/useUnsavedChangesGuard';
import { DEFAULT_INBOX_SETTINGS_TAB, inboxSettingsTabKeys } from './inboxSettingsTabs';
import { inboxSupports } from 'shared/composables/useInboxCapabilities';
import type { TimeZoneOption } from './helpers/businessHour';
import type { UISettings } from 'dashboard/composables/useUISettings';
import type { DashboardPageProps } from '../../types';
import type { Inbox } from './types';

// Trang cài đặt một hộp thư. Tab và khối tuỳ kênh dựng theo năng lực `settings_*`
// kênh tự khai (inboxSettingsTabs.ts), không theo loại kênh. Mọi tab cùng một mô hình
// lưu (settingsDraft): sửa bản nháp, thanh Lưu thay đổi / Huỷ, đổi tab hay rời trang
// khi còn sửa dở thì hỏi lại.
interface ShowProps {
    inboxId: number;
    tab?: string | null;
    senderEmailAddress: string;
    timezoneOptions: TimeZoneOption[];
}

const TAB_LABELS: Record<string, string> = {
    'inbox-settings': 'INBOX_MGMT.TABS.SETTINGS',
    collaborators: 'INBOX_MGMT.TABS.COLLABORATORS',
    'business-hours': 'INBOX_MGMT.TABS.BUSINESS_HOURS',
    csat: 'INBOX_MGMT.TABS.CSAT',
    'pre-chat-form': 'INBOX_MGMT.TABS.PRE_CHAT_FORM',
    configuration: 'INBOX_MGMT.TABS.CONFIGURATION',
    'bot-configuration': 'INBOX_MGMT.TABS.BOT_CONFIGURATION',
};

export default function InboxShow({ inboxId, tab = null, senderEmailAddress, timezoneOptions }: ShowProps) {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;
    const uiSettings = (auth.user?.ui_settings ?? {}) as UISettings;
    const [inbox, setInbox] = useState<Inbox | null>(null);
    const [requestedTab] = useState(tab ?? '');
    const [selectedTabKey, setSelectedTabKey] = useState(DEFAULT_INBOX_SETTINGS_TAB);

    useEffect(() => {
        void getJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`).then(nextInbox => {
            setInbox(nextInbox);
            const tabKeys = inboxSettingsTabKeys(nextInbox);
            setSelectedTabKey(tabKeys.includes(requestedTab) ? requestedTab : DEFAULT_INBOX_SETTINGS_TAB);
        });
    }, [accountId, inboxId, requestedTab]);

    const hasWidgetSettings = inboxSupports(inbox, 'settings_web_widget');
    // Hộp thư có địa chỉ thư thì tiêu đề hiện kèm địa chỉ đó.
    const inboxHeaderTitle = inbox?.email ? `${inbox.name} (${inbox.email})` : (inbox?.name ?? '');
    const tabKeys = useMemo(() => inboxSettingsTabKeys(inbox), [inbox]);
    const selectedTabIndex = Math.max(tabKeys.indexOf(selectedTabKey), 0);

    const tabs: TabItem[] = useMemo(
        () => tabKeys.map(key => ({ key, name: t(TAB_LABELS[key]), showBadge: false })),
        [tabKeys],
    );

    const onTabChange = (index: number) => {
        if (index < 0) return;
        const tabKey = tabKeys[index];
        if (tabKey === selectedTabKey || !confirmDiscardUnsavedChanges(t('SETTINGS_DRAFT.CONFIRM_LEAVE'))) return;
        setSelectedTabKey(tabKey);
        const baseUrl = `/app/accounts/${accountId}/settings/inboxes/${inboxId}`;
        window.history.replaceState(null, '', tabKey === DEFAULT_INBOX_SETTINGS_TAB ? baseUrl : `${baseUrl}/${tabKey}`);
    };

    if (!inbox) {
        return (
            <Dashboard>
                <SettingsContent headerTitle={t('INBOX_MGMT.HEADER')} showBackButton>
                    <div className="flex items-center justify-center h-full w-full">
                        <Loader size={28} className="text-n-blue-9" />
                    </div>
                </SettingsContent>
            </Dashboard>
        );
    }

    return (
        <Dashboard>
            <SettingsContent headerTitle={t('INBOX_MGMT.HEADER')} showBackButton>
                <div className="grid grid-rows-[auto_1fr] grid-cols-[minmax(0,1fr)] h-full flex-grow flex-shrink pr-0 pl-0 w-full min-w-0 settings">
                    <SettingIntroBanner headerTitle={inboxHeaderTitle}>
                        <Tabs
                            className="[&_ul]:p-0 top-px relative"
                            items={tabs}
                            index={selectedTabIndex}
                            border={false}
                            isCompact
                            onChange={onTabChange}
                        />
                    </SettingIntroBanner>
                    <section className="w-full overflow-auto py-8">
                        <div className="max-w-7xl mx-auto w-full">
                            <InboxConnectionAlert
                                inbox={inbox}
                                className="mx-6 mb-6"
                                onFixSettings={
                                    tabKeys.includes('configuration') && selectedTabKey !== 'configuration'
                                        ? () => onTabChange(tabKeys.indexOf('configuration'))
                                        : undefined
                                }
                            />
                            {selectedTabKey === DEFAULT_INBOX_SETTINGS_TAB ? (
                                <InboxSettingsPage inbox={inbox} senderEmailAddress={senderEmailAddress} onInboxUpdated={setInbox} />
                            ) : null}

                            {selectedTabKey === 'collaborators' ? (
                                <div className="mx-6 max-w-4xl">
                                    <CollaboratorsPage inbox={inbox} onInboxUpdated={setInbox} />
                                </div>
                            ) : null}

                            {selectedTabKey === 'business-hours' ? (
                                <WeeklyAvailability
                                    inbox={inbox}
                                    timeZoneOptions={timezoneOptions}
                                    uiSettings={uiSettings}
                                    onInboxUpdated={setInbox}
                                />
                            ) : null}

                            {selectedTabKey === 'csat' ? (
                                <CustomerSatisfactionPage
                                    inbox={inbox}
                                    uiSettings={uiSettings}
                                    onInboxUpdated={setInbox}
                                />
                            ) : null}

                            {selectedTabKey === 'pre-chat-form' ? (
                                <div>
                                    <PreChatFormSettings
                                        inbox={inbox}
                                        uiSettings={uiSettings}
                                        onInboxUpdated={setInbox}
                                    />
                                </div>
                            ) : null}

                            {selectedTabKey === 'configuration' ? (
                                <div className={`mx-6 ${hasWidgetSettings ? 'max-w-7xl' : 'max-w-4xl'}`}>
                                    <ConfigurationPage inbox={inbox} onInboxUpdated={setInbox} />
                                </div>
                            ) : null}

                            {selectedTabKey === 'bot-configuration' ? (
                                <BotConfigurationPage inbox={inbox} />
                            ) : null}
                        </div>
                    </section>
                </div>
            </SettingsContent>
        </Dashboard>
    );
}
