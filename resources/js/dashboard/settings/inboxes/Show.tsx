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
import { INBOX_TYPES, getInboxIconByType } from 'dashboard/helper/inbox';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { inboxSupports } from 'shared/composables/useInboxCapabilities';
import Dashboard from '../../Dashboard';
import SettingsContent from '../SettingsContent';
import SettingIntroBanner from 'dashboard/components/widgets/SettingIntroBanner';
import Tabs from 'dashboard/components/ui/Tabs';
import type { TabItem } from 'dashboard/components/ui/Tabs';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import ColorPicker from 'dashboard/components-next/colorpicker/ColorPicker';
import Editor from 'dashboard/components-next/Editor/Editor';
import SelectInput from 'dashboard/components-next/select/Select';
import Spinner from 'dashboard/components-next/spinner/Spinner';
import SettingsAccordion from 'dashboard/components-next/Settings/SettingsAccordion';
import SettingsFieldSection from 'dashboard/components-next/Settings/SettingsFieldSection';
import SettingsToggleSection from 'dashboard/components-next/Settings/SettingsToggleSection';
import WootInput from 'dashboard/components/widgets/forms/Input';
import GreetingsEditor from 'shared/components/GreetingsEditor';
import AccessToken from 'dashboard/settings/profile/AccessToken';
import Widget from 'dashboard/modules/widget-preview/components/Widget';
import LockToSingleConversationPreview from './components/LockToSingleConversationPreview';
import WeeklyAvailability from './components/WeeklyAvailability';
import SenderNameSection from './components/SenderNameSection';
import PreChatFormSettings from './PreChatForm/Settings';
import CollaboratorsPage from './settingsPage/CollaboratorsPage';
import CustomerSatisfactionPage from './settingsPage/CustomerSatisfactionPage';
import ConfigurationPage from './settingsPage/ConfigurationPage';
import BotConfigurationPage from './settingsPage/BotConfigurationPage';
import ZaloSessionBanner from './channels/ZaloSessionBanner';
import {
    DEFAULT_WIDGET_BUBBLE_SETTINGS,
    WEB_WIDGET_FEATURE_FLAGS,
    readWidgetBubbleSettings,
    toggleFeatureFlag,
    writeWidgetBubbleSettings,
} from './webWidgetHelpers';
import type { WidgetBubbleSettings } from './webWidgetHelpers';
import type { UISettings } from 'dashboard/composables/useUISettings';
import type { DashboardPageProps } from '../../types';
import type { Inbox } from './types';

// Port từ settings/inbox/Settings.vue — nhánh kênh API + Web Widget. Tab Bot
// hiện trên thanh tab như oracle (feature tương ứng chưa port — nội dung trống,
// vào cùng tính năng của nó).
interface ShowProps {
    inboxId: number;
    tab?: string | null;
    senderEmailAddress: string;
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

const FEATURE_FLAG_LABELS: Record<string, string> = {
    attachments: 'INBOX_MGMT.FEATURES.DISPLAY_FILE_PICKER',
    emoji_picker: 'INBOX_MGMT.FEATURES.DISPLAY_EMOJI_PICKER',
    end_conversation: 'INBOX_MGMT.FEATURES.ALLOW_END_CONVERSATION',
    use_inbox_avatar_for_bot: 'INBOX_MGMT.FEATURES.USE_INBOX_AVATAR_FOR_BOT',
};

// tabs() của Settings.vue: tab Configuration CHỈ có ở kênh thật sự có gì để cấu
// hình (Twilio/Line/API/Email tự cấu hình/WhatsApp Cloud/Web widget). Kênh ngoài
// danh sách này không có tab — ConfigurationPage rơi về nhánh API và hiện token
// định danh + HMAC của kênh khác (bằng chứng: inbox Zalo 59).
//
// Zalo cố ý KHÔNG có tab: phần "cấu hình" của nó là tài khoản đang gắn + panel
// QR, và thứ đó phải nằm ngay tab đầu — mất phiên là việc khẩn, không được giấu
// sau một cú bấm. Thẻ tài khoản gate theo NĂNG LỰC `session_qr` (xem dưới).
const CONFIGURATION_TAB_CHANNELS: string[] = [
    INBOX_TYPES.TWILIO,
    INBOX_TYPES.LINE,
    INBOX_TYPES.API,
    INBOX_TYPES.WEB,
];

// canLocktoSingleConversation của Settings.vue.
const LOCK_TO_SINGLE_CONVERSATION_CHANNELS: string[] = [
    INBOX_TYPES.SMS,
    INBOX_TYPES.TWILIO,
    INBOX_TYPES.WHATSAPP,
    INBOX_TYPES.FB,
    INBOX_TYPES.API,
    INBOX_TYPES.INSTAGRAM,
    INBOX_TYPES.LINE,
    INBOX_TYPES.TIKTOK,
    INBOX_TYPES.TELEGRAM,
];

function hasConfigurationTab(channelType: string, provider: string | null | undefined): boolean {
    if (channelType === INBOX_TYPES.EMAIL) return !provider;
    if (channelType === INBOX_TYPES.WHATSAPP) return provider === 'whatsapp_cloud';

    return CONFIGURATION_TAB_CHANNELS.includes(channelType);
}

function tabKeysFor(channelType: string, provider: string | null | undefined): string[] {
    return [
        'inbox-settings',
        'collaborators',
        'business-hours',
        'csat',
        ...(channelType === INBOX_TYPES.WEB ? ['pre-chat-form'] : []),
        ...(hasConfigurationTab(channelType, provider) ? ['configuration'] : []),
        'bot-configuration',
    ];
}

export default function InboxShow({ inboxId, tab = null, senderEmailAddress }: ShowProps) {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;
    const uiSettings = (auth.user?.ui_settings ?? {}) as UISettings;
    const isInboundEmailEnabled = Boolean(currentAccount!.features?.inbound_emails);
    const currentAgentName = auth.user?.display_name || auth.user?.name || '';

    const [inbox, setInbox] = useState<Inbox | null>(null);
    const [requestedTab] = useState(tab ?? '');
    const [selectedTabKey, setSelectedTabKey] = useState('inbox-settings');

    // Form state của tab inbox-settings (syncInboxData).
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [selectedInboxName, setSelectedInboxName] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [greetingEnabled, setGreetingEnabled] = useState(false);
    const [greetingMessage, setGreetingMessage] = useState('');
    const [emailCollectEnabled, setEmailCollectEnabled] = useState(false);
    const [allowMessagesAfterResolved, setAllowMessagesAfterResolved] = useState(true);
    const [continuityViaEmail, setContinuityViaEmail] = useState(true);
    const [senderNameType, setSenderNameType] = useState('friendly');
    const [businessName, setBusinessName] = useState('');
    const [isSavingBusinessName, setSavingBusinessName] = useState(false);
    const [lockToSingleConversation, setLockToSingleConversation] = useState(false);
    const [channelWelcomeTitle, setChannelWelcomeTitle] = useState('');
    const [channelWelcomeTagline, setChannelWelcomeTagline] = useState('');
    const [widgetColor, setWidgetColor] = useState('');
    const [selectedFeatureFlags, setSelectedFeatureFlags] = useState<string[]>([]);
    const [replyTime, setReplyTime] = useState('');
    const [bubbleSettings, setBubbleSettings] = useState<WidgetBubbleSettings>(
        DEFAULT_WIDGET_BUBBLE_SETTINGS,
    );
    const [isUpdating, setUpdating] = useState(false);

    const syncInboxData = (nextInbox: Inbox) => {
        setInbox(nextInbox);
        setAvatarUrl(nextInbox.avatar_url);
        setSelectedInboxName(nextInbox.name);
        setWebhookUrl(nextInbox.webhook_url ?? '');
        setGreetingEnabled(nextInbox.greeting_enabled || false);
        setGreetingMessage(nextInbox.greeting_message ?? '');
        setEmailCollectEnabled(nextInbox.enable_email_collect);
        setAllowMessagesAfterResolved(nextInbox.allow_messages_after_resolved);
        setContinuityViaEmail(nextInbox.continuity_via_email ?? true);
        setSenderNameType(nextInbox.sender_name_type);
        setBusinessName(nextInbox.business_name ?? '');
        setLockToSingleConversation(nextInbox.lock_to_single_conversation);
        setChannelWelcomeTitle(nextInbox.welcome_title ?? '');
        setChannelWelcomeTagline(nextInbox.welcome_tagline ?? '');
        setWidgetColor(nextInbox.widget_color ?? '');
        setSelectedFeatureFlags(nextInbox.selected_feature_flags ?? []);
        setReplyTime(nextInbox.reply_time ?? '');
        setBubbleSettings(readWidgetBubbleSettings(nextInbox.id));
    };

    useEffect(() => {
        void getJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`).then(nextInbox => {
            syncInboxData(nextInbox);
            const tabKeys = tabKeysFor(nextInbox.channel_type, nextInbox.provider);
            setSelectedTabKey(tabKeys.includes(requestedTab) ? requestedTab : 'inbox-settings');
        });
    }, [accountId, inboxId, requestedTab]);

    const isWebWidget = inbox?.channel_type === INBOX_TYPES.WEB;
    const isApiInbox = inbox?.channel_type === INBOX_TYPES.API;
    const isEmailChannel = inbox?.channel_type === INBOX_TYPES.EMAIL;
    // Kênh đăng nhập bằng QR (Zalo hôm nay, kênh sau tự khai `session_qr`) hiện
    // thẻ tài khoản + đường quét lại ngay đầu tab Cài đặt.
    const hasQrSession = inboxSupports(inbox, 'session_qr');
    // inboxName của Settings.vue: kênh email hiện kèm địa chỉ thư.
    const inboxHeaderTitle = isEmailChannel ? `${inbox?.name} (${inbox?.email})` : (inbox?.name ?? '');
    const tabKeys = useMemo(
        () => tabKeysFor(inbox?.channel_type ?? '', inbox?.provider),
        [inbox?.channel_type, inbox?.provider],
    );
    const canLockToSingleConversation = LOCK_TO_SINGLE_CONVERSATION_CHANNELS.includes(
        inbox?.channel_type ?? '',
    );
    const selectedTabIndex = Math.max(tabKeys.indexOf(selectedTabKey), 0);

    const tabs: TabItem[] = useMemo(
        () => tabKeys.map(key => ({ key, name: t(TAB_LABELS[key]), showBadge: false })),
        [tabKeys],
    );

    const onTabChange = (index: number) => {
        const tabKey = tabKeys[index];
        setSelectedTabKey(tabKey);
        const baseUrl = `/app/accounts/${accountId}/settings/inboxes/${inboxId}`;
        window.history.replaceState(null, '', tabKey === 'inbox-settings' ? baseUrl : `${baseUrl}/${tabKey}`);
    };

    // shouldBeUrl của bản gốc: rỗng hợp lệ, có giá trị phải bắt đầu http.
    const webhookUrlInvalid = webhookUrl ? !webhookUrl.startsWith('http') : false;

    const updateInbox = async () => {
        if (!inbox) return;
        writeWidgetBubbleSettings(inbox.id, bubbleSettings);
        setUpdating(true);

        const inboxAttributes: Record<string, unknown> = {
            name: selectedInboxName.trim(),
            enable_email_collect: emailCollectEnabled,
            allow_messages_after_resolved: allowMessagesAfterResolved,
            greeting_enabled: greetingEnabled,
            greeting_message: greetingMessage || '',
            lock_to_single_conversation: lockToSingleConversation,
            sender_name_type: senderNameType,
            business_name: businessName || null,
        };
        const channelAttributes: Record<string, unknown> = {
            widget_color: widgetColor,
            webhook_url: webhookUrl,
            welcome_title: channelWelcomeTitle || '',
            welcome_tagline: channelWelcomeTagline || '',
            selected_feature_flags: selectedFeatureFlags,
            reply_time: replyTime || 'in_a_few_minutes',
            continuity_via_email: isInboundEmailEnabled && continuityViaEmail,
        };

        try {
            let updated: Inbox;
            if (avatarFile) {
                const form = new FormData();
                Object.entries(inboxAttributes).forEach(([key, value]) => {
                    if (typeof value === 'boolean') form.set(key, value ? '1' : '0');
                    else if (value !== null) form.set(key, String(value));
                });
                Object.entries(channelAttributes).forEach(([key, value]) => {
                    if (typeof value === 'boolean') form.set(`channel[${key}]`, value ? '1' : '0');
                    else if (Array.isArray(value)) {
                        // buildInboxData gốc gửi một phần tử rỗng khi danh sách cờ trống —
                        // thiếu nó thì server hiểu là "không đổi" thay vì "tắt hết".
                        if (value.length === 0) form.append(`channel[${key}][]`, '');
                        else value.forEach(item => form.append(`channel[${key}][]`, String(item)));
                    } else if (value !== null) form.set(`channel[${key}]`, String(value));
                });
                form.set('avatar', avatarFile);
                updated = await putForm<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`, form);
            } else {
                updated = await patchJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`, {
                    ...inboxAttributes,
                    channel: channelAttributes,
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

    // Chỉ gửi tên doanh nghiệp, và chỉ cập nhật lại ô đó: các ô khác đang sửa dở giữ nguyên.
    const saveBusinessName = async (): Promise<boolean> => {
        setSavingBusinessName(true);
        try {
            const updated = await patchJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`, {
                business_name: businessName.trim() || null,
            });
            setInbox(updated);
            setBusinessName(updated.business_name ?? '');
            useAlert(t('INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'));
            return true;
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
            return false;
        } finally {
            setSavingBusinessName(false);
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

    const senderNameSection = (
        <SenderNameSection
            senderNameType={senderNameType}
            businessName={businessName}
            inboxName={selectedInboxName}
            agentName={currentAgentName}
            emailAddress={senderEmailAddress}
            isSavingBusinessName={isSavingBusinessName}
            onSenderNameTypeChange={setSenderNameType}
            onBusinessNameChange={setBusinessName}
            onSaveBusinessName={saveBusinessName}
        />
    );

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
                            {selectedTabKey === 'inbox-settings' ? (
                                <div className="flex flex-col md:flex-row items-center lg:items-start justify-between gap-5 lg:gap-10 mx-6">
                                    <div
                                        className={`flex-1 flex flex-col min-w-0 ${isWebWidget ? 'max-w-2xl' : 'max-w-4xl'}`}
                                    >
                                        {hasQrSession ? (
                                            <ZaloSessionBanner
                                                accountId={accountId}
                                                inboxId={inbox.id}
                                                state={inbox.zalo_state}
                                                displayName={inbox.zalo_display_name}
                                                avatarUrl={inbox.avatar_url}
                                                phone={inbox.zalo_phone}
                                                lastConnectedAt={inbox.zalo_last_connected_at}
                                            />
                                        ) : null}
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
                                        <SettingsFieldSection
                                            label={t(
                                                isWebWidget
                                                    ? 'INBOX_MGMT.ADD.WEBSITE_NAME.LABEL'
                                                    : 'INBOX_MGMT.ADD.CHANNEL_NAME.LABEL',
                                            )}
                                        >
                                            <WootInput
                                                value={selectedInboxName}
                                                className="[&>input]:!mb-0"
                                                placeholder={t(
                                                    isWebWidget
                                                        ? 'INBOX_MGMT.ADD.WEBSITE_NAME.PLACEHOLDER'
                                                        : 'INBOX_MGMT.ADD.CHANNEL_NAME.PLACEHOLDER',
                                                )}
                                                onChange={setSelectedInboxName}
                                            />
                                        </SettingsFieldSection>
                                        {isApiInbox ? (
                                            <SettingsFieldSection
                                                label={t(
                                                    'INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WEBHOOK_URL.LABEL',
                                                )}
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
                                        ) : null}

                                        {isApiInbox && inbox.secret ? (
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

                                        {canLockToSingleConversation ? (
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
                                        ) : null}

                                        {isEmailChannel ? <div className="py-2 mb-2">{senderNameSection}</div> : null}

                                        {isWebWidget ? (
                                            <SettingsAccordion
                                                title={t('INBOX_MGMT.WIDGET_FEATURES')}
                                                className="mt-6"
                                            >
                                                <SettingsFieldSection
                                                    label={t(
                                                        'INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WELCOME_TITLE.LABEL',
                                                    )}
                                                >
                                                    <WootInput
                                                        value={channelWelcomeTitle}
                                                        className="[&>input]:!mb-0"
                                                        placeholder={t(
                                                            'INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WELCOME_TITLE.PLACEHOLDER',
                                                        )}
                                                        onChange={setChannelWelcomeTitle}
                                                    />
                                                </SettingsFieldSection>

                                                <SettingsFieldSection
                                                    label={t(
                                                        'INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WELCOME_TAGLINE.LABEL',
                                                    )}
                                                    className="[&>div]:!items-start [&>div>label]:mt-1"
                                                >
                                                    <Editor
                                                        value={channelWelcomeTagline}
                                                        onChange={setChannelWelcomeTagline}
                                                        uiSettings={uiSettings}
                                                        placeholder={t(
                                                            'INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WELCOME_TAGLINE.PLACEHOLDER',
                                                        )}
                                                        maxLength={255}
                                                    />
                                                </SettingsFieldSection>

                                                <SettingsFieldSection
                                                    label={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.WIDGET_COLOR.LABEL')}
                                                >
                                                    <div className="justify-start">
                                                        <ColorPicker value={widgetColor} onChange={setWidgetColor} />
                                                    </div>
                                                </SettingsFieldSection>

                                                <SettingsFieldSection
                                                    label={t(
                                                        'INBOX_MGMT.WIDGET_BUILDER.WIDGET_OPTIONS.WIDGET_BUBBLE',
                                                    )}
                                                >
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-n-slate-11 text-heading-3">
                                                                {t(
                                                                    'INBOX_MGMT.WIDGET_BUILDER.WIDGET_OPTIONS.WIDGET_BUBBLE_POSITION_LABEL',
                                                                )}
                                                            </label>
                                                            <SelectInput
                                                                value={bubbleSettings.position}
                                                                options={[
                                                                    {
                                                                        label: t(
                                                                            'INBOX_MGMT.WIDGET_BUILDER.WIDGET_OPTIONS.WIDGET_BUBBLE_POSITION.LEFT',
                                                                        ),
                                                                        value: 'left',
                                                                    },
                                                                    {
                                                                        label: t(
                                                                            'INBOX_MGMT.WIDGET_BUILDER.WIDGET_OPTIONS.WIDGET_BUBBLE_POSITION.RIGHT',
                                                                        ),
                                                                        value: 'right',
                                                                    },
                                                                ]}
                                                                className="[&>select]:!p-0 min-w-16 [&>select]:!outline-none"
                                                                onChange={position =>
                                                                    setBubbleSettings(current => ({
                                                                        ...current,
                                                                        position,
                                                                    }))
                                                                }
                                                            />
                                                        </div>
                                                        <div className="h-3 w-px bg-n-weak rounded-lg" />
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-n-slate-11 text-heading-3">
                                                                {t(
                                                                    'INBOX_MGMT.WIDGET_BUILDER.WIDGET_OPTIONS.WIDGET_BUBBLE_TYPE_LABEL',
                                                                )}
                                                            </label>
                                                            <SelectInput
                                                                value={bubbleSettings.type}
                                                                options={[
                                                                    {
                                                                        label: t(
                                                                            'INBOX_MGMT.WIDGET_BUILDER.WIDGET_OPTIONS.WIDGET_BUBBLE_TYPE.STANDARD',
                                                                        ),
                                                                        value: 'standard',
                                                                    },
                                                                    {
                                                                        label: t(
                                                                            'INBOX_MGMT.WIDGET_BUILDER.WIDGET_OPTIONS.WIDGET_BUBBLE_TYPE.EXPANDED_BUBBLE',
                                                                        ),
                                                                        value: 'expanded_bubble',
                                                                    },
                                                                ]}
                                                                className="[&>select]:!p-0 min-w-16 [&>select]:!outline-none"
                                                                onChange={type =>
                                                                    setBubbleSettings(current => ({
                                                                        ...current,
                                                                        type,
                                                                    }))
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                </SettingsFieldSection>

                                                <SettingsFieldSection
                                                    label={t(
                                                        'INBOX_MGMT.WIDGET_BUILDER.WIDGET_OPTIONS.WIDGET_BUBBLE_LAUNCHER_TITLE.LABEL',
                                                    )}
                                                >
                                                    <WootInput
                                                        value={bubbleSettings.launcherTitle}
                                                        className="[&>input]:!mb-0"
                                                        placeholder={t(
                                                            'INBOX_MGMT.WIDGET_BUILDER.WIDGET_OPTIONS.WIDGET_BUBBLE_LAUNCHER_TITLE.PLACE_HOLDER',
                                                        )}
                                                        onChange={launcherTitle =>
                                                            setBubbleSettings(current => ({
                                                                ...current,
                                                                launcherTitle,
                                                            }))
                                                        }
                                                    />
                                                </SettingsFieldSection>

                                                <SettingsFieldSection
                                                    label={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.REPLY_TIME.TITLE')}
                                                    helpText={t(
                                                        'INBOX_MGMT.ADD.WEBSITE_CHANNEL.REPLY_TIME.HELP_TEXT',
                                                    )}
                                                >
                                                    <SelectInput
                                                        value={replyTime}
                                                        options={[
                                                            {
                                                                value: 'in_a_few_minutes',
                                                                label: t(
                                                                    'INBOX_MGMT.ADD.WEBSITE_CHANNEL.REPLY_TIME.IN_A_FEW_MINUTES',
                                                                ),
                                                            },
                                                            {
                                                                value: 'in_a_few_hours',
                                                                label: t(
                                                                    'INBOX_MGMT.ADD.WEBSITE_CHANNEL.REPLY_TIME.IN_A_FEW_HOURS',
                                                                ),
                                                            },
                                                            {
                                                                value: 'in_a_day',
                                                                label: t(
                                                                    'INBOX_MGMT.ADD.WEBSITE_CHANNEL.REPLY_TIME.IN_A_DAY',
                                                                ),
                                                            },
                                                        ]}
                                                        onChange={setReplyTime}
                                                    />
                                                </SettingsFieldSection>

                                                <SettingsFieldSection
                                                    label={t('INBOX_MGMT.FEATURES.LABEL')}
                                                    className="[&>div]:!items-start [&>div>label]:mt-2"
                                                >
                                                    <div className="flex flex-col gap-1 items-start">
                                                        {WEB_WIDGET_FEATURE_FLAGS.map((flag, index) => (
                                                            <div
                                                                key={flag}
                                                                className={`flex gap-2 py-0.5 ${index === 0 ? 'pt-2' : ''}`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    value={flag}
                                                                    checked={selectedFeatureFlags.includes(flag)}
                                                                    onChange={() =>
                                                                        setSelectedFeatureFlags(current =>
                                                                            toggleFeatureFlag(current, flag),
                                                                        )
                                                                    }
                                                                />
                                                                <label htmlFor={flag}>
                                                                    {t(FEATURE_FLAG_LABELS[flag])}
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </SettingsFieldSection>
                                            </SettingsAccordion>
                                        ) : null}

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

                                            {isWebWidget ? (
                                                <SettingsToggleSection
                                                    value={emailCollectEnabled}
                                                    onChange={setEmailCollectEnabled}
                                                    header={t(
                                                        'INBOX_MGMT.SETTINGS_POPUP.ENABLE_EMAIL_COLLECT_BOX',
                                                    )}
                                                    description={t(
                                                        'INBOX_MGMT.SETTINGS_POPUP.ENABLE_EMAIL_COLLECT_BOX_SUB_TEXT',
                                                    )}
                                                />
                                            ) : null}

                                            {isWebWidget ? (
                                                <SettingsToggleSection
                                                    value={allowMessagesAfterResolved}
                                                    onChange={setAllowMessagesAfterResolved}
                                                    header={t(
                                                        'INBOX_MGMT.SETTINGS_POPUP.ALLOW_MESSAGES_AFTER_RESOLVED',
                                                    )}
                                                    description={t(
                                                        'INBOX_MGMT.SETTINGS_POPUP.ALLOW_MESSAGES_AFTER_RESOLVED_SUB_TEXT',
                                                    )}
                                                />
                                            ) : null}

                                            {isWebWidget && isInboundEmailEnabled ? (
                                                <SettingsToggleSection
                                                    value={continuityViaEmail}
                                                    onChange={setContinuityViaEmail}
                                                    header={t(
                                                        'INBOX_MGMT.SETTINGS_POPUP.ENABLE_CONTINUITY_VIA_EMAIL',
                                                    )}
                                                    description={t(
                                                        'INBOX_MGMT.SETTINGS_POPUP.ENABLE_CONTINUITY_VIA_EMAIL_SUB_TEXT',
                                                    )}
                                                    editor={continuityViaEmail ? senderNameSection : undefined}
                                                />
                                            ) : null}
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

                                    {isWebWidget ? (
                                        <div className="flex-1 sticky top-4 self-start max-w-lg flex-shrink-0 w-full min-w-0">
                                            <div className="flex flex-col outline -outline-offset-1 outline-1 outline-n-weak w-full px-3 pt-3 pb-8 bg-n-surface-1 rounded-2xl min-h-[45rem] overflow-hidden">
                                                <Widget
                                                    welcomeHeading={channelWelcomeTitle}
                                                    welcomeTagline={channelWelcomeTagline}
                                                    websiteName={selectedInboxName}
                                                    logo={avatarUrl}
                                                    isOnline
                                                    replyTime={replyTime}
                                                    color={widgetColor}
                                                    widgetBubblePosition={bubbleSettings.position}
                                                    widgetBubbleLauncherTitle={bubbleSettings.launcherTitle}
                                                    widgetBubbleType={bubbleSettings.type}
                                                    webWidgetScript={inbox.web_widget_script ?? ''}
                                                />
                                            </div>
                                            <p className="mt-2 text-center text-label-small text-n-slate-11">
                                                {t('INBOX_MGMT.SETTINGS_POPUP.EMBED_SCRIPT.HINT_IN_BUILDER')}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

                            {selectedTabKey === 'collaborators' ? (
                                <div className="mx-6 max-w-4xl">
                                    <CollaboratorsPage inbox={inbox} onInboxUpdated={syncInboxData} />
                                </div>
                            ) : null}

                            {selectedTabKey === 'business-hours' ? (
                                <WeeklyAvailability
                                    inbox={inbox}
                                    uiSettings={uiSettings}
                                    onInboxUpdated={syncInboxData}
                                />
                            ) : null}

                            {selectedTabKey === 'csat' ? (
                                <CustomerSatisfactionPage
                                    inbox={inbox}
                                    uiSettings={uiSettings}
                                    onInboxUpdated={syncInboxData}
                                />
                            ) : null}

                            {selectedTabKey === 'pre-chat-form' ? (
                                <div>
                                    <PreChatFormSettings
                                        inbox={inbox}
                                        uiSettings={uiSettings}
                                        onInboxUpdated={syncInboxData}
                                    />
                                </div>
                            ) : null}

                            {selectedTabKey === 'configuration' ? (
                                <div className={`mx-6 ${isWebWidget ? 'max-w-7xl' : 'max-w-4xl'}`}>
                                    <ConfigurationPage inbox={inbox} onInboxUpdated={syncInboxData} />
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
