import { useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import {
    deleteJson,
    getJson,
    parseApiErrorMessage,
    patchJson,
    postJson,
    putForm,
} from 'dashboard/helper/apiClient';
import { getInboxIconByType } from 'dashboard/helper/inbox';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import Dashboard from '../../Dashboard';
import SettingsContent from '../SettingsContent';
import SettingIntroBanner from 'dashboard/components/widgets/SettingIntroBanner';
import Tabs from 'dashboard/components/ui/Tabs';
import type { TabItem } from 'dashboard/components/ui/Tabs';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import SelectInput from 'dashboard/components-next/select/Select';
import Spinner from 'dashboard/components-next/spinner/Spinner';
import SettingsAccordion from 'dashboard/components-next/Settings/SettingsAccordion';
import SettingsFieldSection from 'dashboard/components-next/Settings/SettingsFieldSection';
import SettingsToggleSection from 'dashboard/components-next/Settings/SettingsToggleSection';
import WootInput from 'dashboard/components/widgets/forms/Input';
import GreetingsEditor from 'shared/components/GreetingsEditor';
import AccessToken from 'dashboard/settings/profile/AccessToken';
import LockToSingleConversationPreview from './components/LockToSingleConversationPreview';
import CollaboratorsPage from './settingsPage/CollaboratorsPage';
import ConfigurationPage from './settingsPage/ConfigurationPage';
import type { DashboardPageProps } from '../../types';
import type { Inbox } from './types';

// Port từ settings/inbox/Settings.vue — nhánh kênh API. Tab Business Hours /
// CSAT / Bot hiện trên thanh tab như bản gốc (features tương ứng chưa port —
// nội dung để trống, vào cùng tính năng của chúng).
interface ShowProps {
    inboxId: number;
    tab?: string | null;
}

const TAB_KEYS = [
    'inbox-settings',
    'collaborators',
    'business-hours',
    'csat',
    'configuration',
    'bot-configuration',
] as const;

const TAB_LABELS: Record<string, string> = {
    'inbox-settings': 'INBOX_MGMT.TABS.SETTINGS',
    collaborators: 'INBOX_MGMT.TABS.COLLABORATORS',
    'business-hours': 'INBOX_MGMT.TABS.BUSINESS_HOURS',
    csat: 'INBOX_MGMT.TABS.CSAT',
    configuration: 'INBOX_MGMT.TABS.CONFIGURATION',
    'bot-configuration': 'INBOX_MGMT.TABS.BOT_CONFIGURATION',
};

export default function InboxShow({ inboxId, tab = null }: ShowProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [inbox, setInbox] = useState<Inbox | null>(null);
    const [selectedTabIndex, setSelectedTabIndex] = useState(() => {
        const tabIndex = TAB_KEYS.indexOf((tab ?? '') as (typeof TAB_KEYS)[number]);
        return tabIndex === -1 ? 0 : tabIndex;
    });

    // Form state của tab inbox-settings (syncInboxData).
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [selectedInboxName, setSelectedInboxName] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [greetingEnabled, setGreetingEnabled] = useState(false);
    const [greetingMessage, setGreetingMessage] = useState('');
    const [lockToSingleConversation, setLockToSingleConversation] = useState(false);
    const [isUpdating, setUpdating] = useState(false);

    const syncInboxData = (nextInbox: Inbox) => {
        setInbox(nextInbox);
        setAvatarUrl(nextInbox.avatar_url);
        setSelectedInboxName(nextInbox.name);
        setWebhookUrl(nextInbox.webhook_url ?? '');
        setGreetingEnabled(nextInbox.greeting_enabled || false);
        setGreetingMessage(nextInbox.greeting_message ?? '');
        setLockToSingleConversation(nextInbox.lock_to_single_conversation);
    };

    useEffect(() => {
        void getJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`).then(syncInboxData);
    }, [accountId, inboxId]);

    const tabs: TabItem[] = useMemo(
        () => TAB_KEYS.map(key => ({ key, name: t(TAB_LABELS[key]), showBadge: false })),
        [],
    );

    const selectedTabKey = TAB_KEYS[selectedTabIndex];

    const onTabChange = (index: number) => {
        setSelectedTabIndex(index);
        const tabKey = TAB_KEYS[index];
        const baseUrl = `/app/accounts/${accountId}/settings/inboxes/${inboxId}`;
        window.history.replaceState(null, '', tabKey === 'inbox-settings' ? baseUrl : `${baseUrl}/${tabKey}`);
    };

    // shouldBeUrl của bản gốc: rỗng hợp lệ, có giá trị phải bắt đầu http.
    const webhookUrlInvalid = webhookUrl ? !webhookUrl.startsWith('http') : false;

    const updateInbox = async () => {
        if (!inbox) return;
        setUpdating(true);

        try {
            let updated: Inbox;
            if (avatarFile) {
                const form = new FormData();
                form.set('name', selectedInboxName.trim());
                form.set('greeting_enabled', greetingEnabled ? '1' : '0');
                form.set('greeting_message', greetingMessage || '');
                form.set('lock_to_single_conversation', lockToSingleConversation ? '1' : '0');
                form.set('channel[webhook_url]', webhookUrl);
                form.set('avatar', avatarFile);
                updated = await putForm<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`, form);
            } else {
                updated = await patchJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`, {
                    name: selectedInboxName.trim(),
                    greeting_enabled: greetingEnabled,
                    greeting_message: greetingMessage || '',
                    lock_to_single_conversation: lockToSingleConversation,
                    channel: { webhook_url: webhookUrl },
                });
            }
            setAvatarFile(null);
            syncInboxData(updated);
            useAlert(t('INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
        } finally {
            setUpdating(false);
        }
    };

    const handleAvatarDelete = async () => {
        try {
            await deleteJson(`/api/v1/accounts/${accountId}/inboxes/${inboxId}/avatar`);
            setAvatarFile(null);
            setAvatarUrl('');
            useAlert(t('INBOX_MGMT.DELETE.API.AVATAR_SUCCESS_MESSAGE'));
        } catch {
            useAlert(t('INBOX_MGMT.DELETE.API.AVATAR_ERROR_MESSAGE'));
        }
    };

    const copyWebhookSecret = async (value: string) => {
        await copyTextToClipboard(value);
        useAlert(t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WEBHOOK_SECRET.COPY_SUCCESS'));
    };

    const resetWebhookSecret = async () => {
        try {
            const updated = await postJson<Inbox>(
                `/api/v1/accounts/${accountId}/inboxes/${inboxId}/reset_secret`,
                {},
            );
            syncInboxData(updated);
            useAlert(t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WEBHOOK_SECRET.RESET_SUCCESS'));
        } catch {
            useAlert(t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WEBHOOK_SECRET.RESET_ERROR'));
        }
    };

    if (!inbox) {
        return (
            <Dashboard>
                <SettingsContent headerTitle={t('INBOX_MGMT.HEADER')} showBackButton>
                    <div className="flex items-center justify-center h-full w-full">
                        <Spinner size={28} className="text-n-blue-9" />
                    </div>
                </SettingsContent>
            </Dashboard>
        );
    }

    return (
        <Dashboard>
            <SettingsContent headerTitle={t('INBOX_MGMT.HEADER')} showBackButton>
                <div className="grid grid-rows-[auto_1fr] h-full flex-grow flex-shrink pr-0 pl-0 w-full min-w-0 settings">
                    <SettingIntroBanner headerTitle={inbox.name}>
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
                            {selectedTabKey === 'inbox-settings' ? (
                                <div className="flex flex-col md:flex-row items-center lg:items-start justify-between gap-5 lg:gap-10 mx-6">
                                    <div className="flex-1 flex flex-col min-w-0 max-w-4xl">
                                        <div className="flex flex-col gap-1 items-start mb-4">
                                            <label className="text-heading-3 text-n-slate-12">
                                                {t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_AVATAR.LABEL')}
                                            </label>
                                            <Avatar
                                                src={avatarUrl}
                                                size={64}
                                                iconName={getInboxIconByType(inbox.channel_type)}
                                                name=""
                                                allowUpload
                                                roundedFull
                                                onUpload={({ file, url }) => {
                                                    setAvatarFile(file);
                                                    setAvatarUrl(url ?? '');
                                                }}
                                                onDelete={() => void handleAvatarDelete()}
                                            />
                                        </div>
                                        <SettingsFieldSection label={t('INBOX_MGMT.ADD.CHANNEL_NAME.LABEL')}>
                                            <WootInput
                                                value={selectedInboxName}
                                                className="[&>input]:!mb-0"
                                                placeholder={t('INBOX_MGMT.ADD.CHANNEL_NAME.PLACEHOLDER')}
                                                onChange={setSelectedInboxName}
                                            />
                                        </SettingsFieldSection>
                                        <SettingsFieldSection
                                            label={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WEBHOOK_URL.LABEL')}
                                        >
                                            <WootInput
                                                value={webhookUrl}
                                                className={`[&>input]:!mb-0 ${webhookUrlInvalid ? 'error' : ''}`}
                                                placeholder={t(
                                                    'INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WEBHOOK_URL.PLACEHOLDER',
                                                )}
                                                error={
                                                    webhookUrlInvalid
                                                        ? t(
                                                              'INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WEBHOOK_URL.ERROR',
                                                          )
                                                        : ''
                                                }
                                                onChange={setWebhookUrl}
                                            />
                                        </SettingsFieldSection>

                                        {inbox.secret ? (
                                            <SettingsFieldSection
                                                label={t(
                                                    'INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WEBHOOK_SECRET.LABEL',
                                                )}
                                            >
                                                <AccessToken
                                                    value={inbox.secret}
                                                    onCopy={value => void copyWebhookSecret(value)}
                                                    onReset={() => void resetWebhookSecret()}
                                                />
                                            </SettingsFieldSection>
                                        ) : null}

                                        <SettingsFieldSection
                                            label={t('INBOX_MGMT.HELP_CENTER.LABEL')}
                                            helpText={t('INBOX_MGMT.HELP_CENTER.SUB_TEXT')}
                                        >
                                            <SelectInput
                                                value=""
                                                placeholder={t('INBOX_MGMT.HELP_CENTER.PLACEHOLDER')}
                                                options={[{ value: '', label: t('INBOX_MGMT.HELP_CENTER.NONE') }]}
                                                onChange={() => undefined}
                                            />
                                        </SettingsFieldSection>

                                        <SettingsFieldSection
                                            label={t('INBOX_MGMT.SETTINGS_POPUP.LOCK_TO_SINGLE_CONVERSATION')}
                                            className="[&>div>div]:justify-end [&>div>div]:flex lg:[&>div:first-child]:h-12 [&>div:first-child]:h-16"
                                            extra={
                                                <LockToSingleConversationPreview
                                                    lockToSingleConversation={lockToSingleConversation}
                                                    onUpdate={setLockToSingleConversation}
                                                />
                                            }
                                        />

                                        <SettingsAccordion
                                            title={t('INBOX_MGMT.CHANNEL_PREFERENCES')}
                                            className="mt-6"
                                        >
                                            <SettingsToggleSection
                                                value={greetingEnabled}
                                                onChange={setGreetingEnabled}
                                                header={t(
                                                    'INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_GREETING_TOGGLE.LABEL',
                                                )}
                                                description={t(
                                                    'INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_GREETING_TOGGLE.HELP_TEXT',
                                                )}
                                                editor={
                                                    greetingEnabled ? (
                                                        <GreetingsEditor
                                                            value={greetingMessage}
                                                            label={t(
                                                                'INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_GREETING_MESSAGE.LABEL',
                                                            )}
                                                            placeholder={t(
                                                                'INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_GREETING_MESSAGE.PLACEHOLDER',
                                                            )}
                                                            onChange={setGreetingMessage}
                                                        />
                                                    ) : undefined
                                                }
                                            />
                                        </SettingsAccordion>

                                        <div className="w-full flex justify-end items-center py-4 mt-2">
                                            <Button
                                                type="submit"
                                                disabled={webhookUrlInvalid}
                                                label={t('INBOX_MGMT.SETTINGS_POPUP.UPDATE')}
                                                isLoading={isUpdating}
                                                onClick={() => void updateInbox()}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {selectedTabKey === 'collaborators' ? (
                                <div className="mx-6 max-w-4xl">
                                    <CollaboratorsPage inbox={inbox} onInboxUpdated={syncInboxData} />
                                </div>
                            ) : null}

                            {selectedTabKey === 'configuration' ? (
                                <div className="mx-6 max-w-4xl">
                                    <ConfigurationPage inbox={inbox} onInboxUpdated={syncInboxData} />
                                </div>
                            ) : null}
                        </div>
                    </section>
                </div>
            </SettingsContent>
        </Dashboard>
    );
}
