import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { deleteJson, parseApiErrorMessage, patchJson, postJson, putForm } from 'dashboard/helper/apiClient';
import { getInboxIconByType } from 'dashboard/helper/inbox';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { inboxSupports } from 'shared/composables/useInboxCapabilities';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import ColorPicker from 'dashboard/components-next/colorpicker/ColorPicker';
import SelectInput from 'dashboard/components-next/select/Select';
import TextArea from 'dashboard/components-next/textarea/TextArea';
import SettingsAccordion from 'dashboard/components-next/Settings/SettingsAccordion';
import SettingsFieldSection from 'dashboard/components-next/Settings/SettingsFieldSection';
import SettingsToggleSection from 'dashboard/components-next/Settings/SettingsToggleSection';
import WootInput from 'dashboard/components/widgets/forms/Input';
import GreetingsEditor from 'shared/components/GreetingsEditor';
import AccessToken from 'dashboard/settings/profile/AccessToken';
import LockToSingleConversationPreview from '../components/LockToSingleConversationPreview';
import SenderNameSection from '../components/SenderNameSection';
import ZaloSessionBanner from '../channels/ZaloSessionBanner';
import PreviewPane from '../widget-builder/components/PreviewPane';
import { DEFAULT_WIDGET_SETTINGS } from '../widget-builder/draft';
import SettingsSaveBar from '../settingsDraft/SettingsSaveBar';
import { useSettingsDraft } from '../settingsDraft/useSettingsDraft';
import { WEB_WIDGET_FEATURE_FLAGS, WELCOME_TAGLINE_MAX_LENGTH, toggleFeatureFlag } from '../webWidgetHelpers';
import type { DashboardPageProps } from '../../../types';
import type { Inbox } from '../types';

const FEATURE_FLAG_LABELS: Record<string, string> = {
    attachments: 'INBOX_MGMT.FEATURES.DISPLAY_FILE_PICKER',
    emoji_picker: 'INBOX_MGMT.FEATURES.DISPLAY_EMOJI_PICKER',
    end_conversation: 'INBOX_MGMT.FEATURES.ALLOW_END_CONVERSATION',
    use_inbox_avatar_for_bot: 'INBOX_MGMT.FEATURES.USE_INBOX_AVATAR_FOR_BOT',
};

const REPLY_TIME_OPTIONS = [
    { value: 'in_a_few_minutes', labelKey: 'INBOX_MGMT.ADD.WEBSITE_CHANNEL.REPLY_TIME.IN_A_FEW_MINUTES' },
    { value: 'in_a_few_hours', labelKey: 'INBOX_MGMT.ADD.WEBSITE_CHANNEL.REPLY_TIME.IN_A_FEW_HOURS' },
    { value: 'in_a_day', labelKey: 'INBOX_MGMT.ADD.WEBSITE_CHANNEL.REPLY_TIME.IN_A_DAY' },
];

interface InboxSettingsDraft {
    avatarUrl: string;
    name: string;
    webhookUrl: string;
    greetingEnabled: boolean;
    greetingMessage: string;
    emailCollectEnabled: boolean;
    allowMessagesAfterResolved: boolean;
    continuityViaEmail: boolean;
    senderNameType: string;
    businessName: string;
    lockToSingleConversation: boolean;
    welcomeTitle: string;
    welcomeTagline: string;
    widgetColor: string;
    selectedFeatureFlags: string[];
    replyTime: string;
}

function inboxSettingsDraftOf(inbox: Inbox): InboxSettingsDraft {
    return {
        avatarUrl: inbox.avatar_url,
        name: inbox.name,
        webhookUrl: inbox.webhook_url ?? '',
        greetingEnabled: inbox.greeting_enabled || false,
        greetingMessage: inbox.greeting_message ?? '',
        emailCollectEnabled: inbox.enable_email_collect,
        allowMessagesAfterResolved: inbox.allow_messages_after_resolved,
        continuityViaEmail: inbox.continuity_via_email ?? true,
        senderNameType: inbox.sender_name_type,
        businessName: inbox.business_name ?? '',
        lockToSingleConversation: inbox.lock_to_single_conversation,
        welcomeTitle: inbox.welcome_title ?? '',
        welcomeTagline: inbox.welcome_tagline ?? '',
        widgetColor: inbox.widget_color ?? '',
        selectedFeatureFlags: inbox.selected_feature_flags ?? [],
        replyTime: inbox.reply_time ?? '',
    };
}

// PUT multipart khi có ảnh đại diện mới: cờ boolean thành '1'/'0', danh sách cờ rỗng
// vẫn gửi một phần tử rỗng — thiếu nó thì máy chủ hiểu là "không đổi" thay vì "tắt hết".
function inboxFormData(inboxAttributes: Record<string, unknown>, channelAttributes: Record<string, unknown>, avatarFile: File): FormData {
    const form = new FormData();
    Object.entries(inboxAttributes).forEach(([key, value]) => {
        if (typeof value === 'boolean') form.set(key, value ? '1' : '0');
        else if (value !== null) form.set(key, String(value));
    });
    Object.entries(channelAttributes).forEach(([key, value]) => {
        if (typeof value === 'boolean') form.set(`channel[${key}]`, value ? '1' : '0');
        else if (Array.isArray(value)) {
            if (value.length === 0) form.append(`channel[${key}][]`, '');
            else value.forEach(item => form.append(`channel[${key}][]`, String(item)));
        } else if (value !== null) form.set(`channel[${key}]`, String(value));
    });
    form.set('avatar', avatarFile);

    return form;
}

interface InboxSettingsPageProps {
    inbox: Inbox;
    senderEmailAddress: string;
    onInboxUpdated: (inbox: Inbox) => void;
}

// Tab "Cài đặt" của một hộp thư: khối nào hiện do kênh tự khai năng lực `settings_*`.
// Hộp thư website xem trước bằng chính widget thật (cùng khung với màn Widget chat).
export default function InboxSettingsPage({ inbox, senderEmailAddress, onInboxUpdated }: InboxSettingsPageProps) {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;
    const isInboundEmailEnabled = Boolean(currentAccount!.features?.inbound_emails);
    const currentAgentName = auth.user?.display_name || auth.user?.name || '';

    const { draft, patchDraft, acceptSaved, isDirty, isSaving, reset, save } = useSettingsDraft(inboxSettingsDraftOf(inbox));
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [isSavingBusinessName, setSavingBusinessName] = useState(false);

    const hasWidgetSettings = inboxSupports(inbox, 'settings_web_widget');
    const hasWebhookSettings = inboxSupports(inbox, 'settings_webhook');
    const hasSenderNameSettings = inboxSupports(inbox, 'settings_sender_name');
    const hasSingleConversationSettings = inboxSupports(inbox, 'settings_single_conversation');
    // Kênh đăng nhập bằng QR (Zalo hôm nay, kênh sau tự khai `session_qr`) hiện
    // thẻ tài khoản + đường quét lại ngay đầu tab: mất phiên là việc khẩn.
    const hasQrSession = inboxSupports(inbox, 'session_qr');

    // shouldBeUrl của bản gốc: rỗng hợp lệ, có giá trị phải bắt đầu http.
    const webhookUrlInvalid = draft.webhookUrl ? !draft.webhookUrl.startsWith('http') : false;

    const discardChanges = () => {
        setAvatarFile(null);
        reset();
    };

    const updateInbox = () =>
        save(async submitted => {
            const inboxAttributes: Record<string, unknown> = {
                name: submitted.name.trim(),
                enable_email_collect: submitted.emailCollectEnabled,
                allow_messages_after_resolved: submitted.allowMessagesAfterResolved,
                greeting_enabled: submitted.greetingEnabled,
                greeting_message: submitted.greetingMessage || '',
                lock_to_single_conversation: submitted.lockToSingleConversation,
                sender_name_type: submitted.senderNameType,
                business_name: submitted.businessName || null,
            };
            const channelAttributes: Record<string, unknown> = {
                widget_color: submitted.widgetColor,
                webhook_url: submitted.webhookUrl,
                welcome_title: submitted.welcomeTitle || '',
                welcome_tagline: submitted.welcomeTagline || '',
                selected_feature_flags: submitted.selectedFeatureFlags,
                reply_time: submitted.replyTime || 'in_a_few_minutes',
                continuity_via_email: isInboundEmailEnabled && submitted.continuityViaEmail,
            };
            const url = `/api/v1/accounts/${accountId}/inboxes/${inbox.id}`;

            try {
                const updated = avatarFile
                    ? await putForm<Inbox>(url, inboxFormData(inboxAttributes, channelAttributes, avatarFile))
                    : await patchJson<Inbox>(url, { ...inboxAttributes, channel: channelAttributes });
                setAvatarFile(null);
                onInboxUpdated(updated);
                useAlert(t('INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'));
                return true;
            } catch (error) {
                useAlert(parseApiErrorMessage(error) || t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
                return false;
            }
        });

    // Ô tên doanh nghiệp có nút Lưu riêng: chỉ gửi tên doanh nghiệp, các ô khác đang sửa dở giữ nguyên.
    const saveBusinessName = async (): Promise<boolean> => {
        setSavingBusinessName(true);
        try {
            const updated = await patchJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inbox.id}`, {
                business_name: draft.businessName.trim() || null,
            });
            acceptSaved({ businessName: updated.business_name ?? '' });
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
            await deleteJson(`/api/v1/accounts/${accountId}/inboxes/${inbox.id}/avatar`);
            setAvatarFile(null);
            acceptSaved({ avatarUrl: '' });
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
            onInboxUpdated(await postJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inbox.id}/reset_secret`, {}));
            useAlert(t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WEBHOOK_SECRET.RESET_SUCCESS'));
        } catch {
            useAlert(t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WEBHOOK_SECRET.RESET_ERROR'));
        }
    };

    const senderNameSection = (
        <SenderNameSection
            senderNameType={draft.senderNameType}
            businessName={draft.businessName}
            inboxName={draft.name}
            agentName={currentAgentName}
            emailAddress={senderEmailAddress}
            isSavingBusinessName={isSavingBusinessName}
            onSenderNameTypeChange={senderNameType => patchDraft({ senderNameType })}
            onBusinessNameChange={businessName => patchDraft({ businessName })}
            onSaveBusinessName={saveBusinessName}
        />
    );

    return (
        <div className="flex flex-col md:flex-row items-center lg:items-start justify-between gap-5 lg:gap-10 mx-6">
            <div className={`flex-1 flex flex-col min-w-0 w-full ${hasWidgetSettings ? 'max-w-2xl' : 'max-w-4xl'}`}>
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
                    <label className="text-heading-3 text-n-slate-12">{t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_AVATAR.LABEL')}</label>
                    <Avatar
                        src={draft.avatarUrl}
                        size={64}
                        iconName={getInboxIconByType(inbox.channel_type)}
                        name=""
                        allowUpload
                        roundedFull
                        onUpload={({ file, url }) => {
                            setAvatarFile(file);
                            patchDraft({ avatarUrl: url ?? '' });
                        }}
                        onDelete={() => void handleAvatarDelete()}
                    />
                </div>
                <SettingsFieldSection label={t(hasWidgetSettings ? 'INBOX_MGMT.ADD.WEBSITE_NAME.LABEL' : 'INBOX_MGMT.ADD.CHANNEL_NAME.LABEL')}>
                    <WootInput
                        value={draft.name}
                        className="[&>input]:!mb-0"
                        placeholder={t(hasWidgetSettings ? 'INBOX_MGMT.ADD.WEBSITE_NAME.PLACEHOLDER' : 'INBOX_MGMT.ADD.CHANNEL_NAME.PLACEHOLDER')}
                        onChange={name => patchDraft({ name })}
                    />
                </SettingsFieldSection>
                {hasWebhookSettings ? (
                    <SettingsFieldSection label={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WEBHOOK_URL.LABEL')}>
                        <WootInput
                            value={draft.webhookUrl}
                            className={`[&>input]:!mb-0 ${webhookUrlInvalid ? 'error' : ''}`}
                            placeholder={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WEBHOOK_URL.PLACEHOLDER')}
                            error={webhookUrlInvalid ? t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WEBHOOK_URL.ERROR') : ''}
                            onChange={webhookUrl => patchDraft({ webhookUrl })}
                        />
                    </SettingsFieldSection>
                ) : null}

                {hasWebhookSettings && inbox.secret ? (
                    <SettingsFieldSection label={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WEBHOOK_SECRET.LABEL')}>
                        <AccessToken
                            value={inbox.secret}
                            onCopy={value => void copyWebhookSecret(value)}
                            onReset={() => void resetWebhookSecret()}
                        />
                    </SettingsFieldSection>
                ) : null}

                {hasSingleConversationSettings ? (
                    <SettingsFieldSection
                        label={t('INBOX_MGMT.SETTINGS_POPUP.LOCK_TO_SINGLE_CONVERSATION')}
                        className="[&>div>div]:justify-end [&>div>div]:flex lg:[&>div:first-child]:h-12 [&>div:first-child]:h-16"
                        extra={
                            <LockToSingleConversationPreview
                                lockToSingleConversation={draft.lockToSingleConversation}
                                onUpdate={lockToSingleConversation => patchDraft({ lockToSingleConversation })}
                            />
                        }
                    />
                ) : null}

                {hasSenderNameSettings ? <div className="py-2 mb-2">{senderNameSection}</div> : null}

                {hasWidgetSettings ? (
                    <SettingsAccordion title={t('INBOX_MGMT.WIDGET_FEATURES')} className="mt-6">
                        <SettingsFieldSection
                            label={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WELCOME_TITLE.LABEL')}
                            helpText={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WELCOME_TITLE.HELP_TEXT')}
                        >
                            <WootInput
                                value={draft.welcomeTitle}
                                className="[&>input]:!mb-0"
                                placeholder={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WELCOME_TITLE.PLACEHOLDER')}
                                onChange={welcomeTitle => patchDraft({ welcomeTitle })}
                            />
                        </SettingsFieldSection>

                        <SettingsFieldSection
                            label={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WELCOME_TAGLINE.LABEL')}
                            helpText={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WELCOME_TAGLINE.HELP_TEXT')}
                            className="[&>div]:!items-start [&>div>label]:mt-1"
                        >
                            <TextArea
                                id="welcome-tagline"
                                value={draft.welcomeTagline}
                                onChange={welcomeTagline => patchDraft({ welcomeTagline })}
                                placeholder={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_WELCOME_TAGLINE.PLACEHOLDER')}
                                maxLength={WELCOME_TAGLINE_MAX_LENGTH}
                                showCharacterCount
                                autoHeight
                            />
                        </SettingsFieldSection>

                        <SettingsFieldSection label={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.WIDGET_COLOR.LABEL')}>
                            <div className="justify-start">
                                <ColorPicker value={draft.widgetColor} onChange={widgetColor => patchDraft({ widgetColor })} />
                            </div>
                        </SettingsFieldSection>

                        <SettingsFieldSection
                            label={t('INBOX_MGMT.WIDGET_BUILDER.OPEN_BUILDER.LABEL')}
                            helpText={t('INBOX_MGMT.WIDGET_BUILDER.OPEN_BUILDER.HELP_TEXT')}
                        >
                            <Button
                                variant="outline"
                                color="slate"
                                icon="i-lucide-wand-sparkles"
                                label={t('INBOX_MGMT.WIDGET_BUILDER.OPEN_BUILDER.BUTTON')}
                                onClick={() => router.visit(accountScopedUrl(accountId, `settings/inboxes/${inbox.id}/widget`))}
                            />
                        </SettingsFieldSection>

                        <SettingsFieldSection
                            label={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.REPLY_TIME.TITLE')}
                            helpText={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.REPLY_TIME.HELP_TEXT')}
                        >
                            <SelectInput
                                value={draft.replyTime}
                                options={REPLY_TIME_OPTIONS.map(option => ({ value: option.value, label: t(option.labelKey) }))}
                                onChange={replyTime => patchDraft({ replyTime })}
                            />
                        </SettingsFieldSection>

                        <SettingsFieldSection label={t('INBOX_MGMT.FEATURES.LABEL')} className="[&>div]:!items-start [&>div>label]:mt-2">
                            <div className="flex flex-col gap-1 items-start">
                                {WEB_WIDGET_FEATURE_FLAGS.map((flag, index) => (
                                    <div key={flag} className={`flex gap-2 py-0.5 ${index === 0 ? 'pt-2' : ''}`}>
                                        <input
                                            id={flag}
                                            type="checkbox"
                                            value={flag}
                                            checked={draft.selectedFeatureFlags.includes(flag)}
                                            onChange={() =>
                                                patchDraft({ selectedFeatureFlags: toggleFeatureFlag(draft.selectedFeatureFlags, flag) })
                                            }
                                        />
                                        <label htmlFor={flag}>{t(FEATURE_FLAG_LABELS[flag])}</label>
                                    </div>
                                ))}
                            </div>
                        </SettingsFieldSection>
                    </SettingsAccordion>
                ) : null}

                <SettingsAccordion title={t('INBOX_MGMT.CHANNEL_PREFERENCES')} className="mt-6">
                    <SettingsToggleSection
                        value={draft.greetingEnabled}
                        onChange={greetingEnabled => patchDraft({ greetingEnabled })}
                        header={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_GREETING_TOGGLE.LABEL')}
                        description={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_GREETING_TOGGLE.HELP_TEXT')}
                        editor={
                            draft.greetingEnabled ? (
                                <GreetingsEditor
                                    value={draft.greetingMessage}
                                    label={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_GREETING_MESSAGE.LABEL')}
                                    placeholder={t('INBOX_MGMT.ADD.WEBSITE_CHANNEL.CHANNEL_GREETING_MESSAGE.PLACEHOLDER')}
                                    onChange={greetingMessage => patchDraft({ greetingMessage })}
                                />
                            ) : undefined
                        }
                    />

                    {hasWidgetSettings ? (
                        <SettingsToggleSection
                            value={draft.emailCollectEnabled}
                            onChange={emailCollectEnabled => patchDraft({ emailCollectEnabled })}
                            header={t('INBOX_MGMT.SETTINGS_POPUP.ENABLE_EMAIL_COLLECT_BOX')}
                            description={t('INBOX_MGMT.SETTINGS_POPUP.ENABLE_EMAIL_COLLECT_BOX_SUB_TEXT')}
                        />
                    ) : null}

                    {hasWidgetSettings ? (
                        <SettingsToggleSection
                            value={draft.allowMessagesAfterResolved}
                            onChange={allowMessagesAfterResolved => patchDraft({ allowMessagesAfterResolved })}
                            header={t('INBOX_MGMT.SETTINGS_POPUP.ALLOW_MESSAGES_AFTER_RESOLVED')}
                            description={t('INBOX_MGMT.SETTINGS_POPUP.ALLOW_MESSAGES_AFTER_RESOLVED_SUB_TEXT')}
                        />
                    ) : null}

                    {hasWidgetSettings && isInboundEmailEnabled ? (
                        <SettingsToggleSection
                            value={draft.continuityViaEmail}
                            onChange={continuityViaEmail => patchDraft({ continuityViaEmail })}
                            header={t('INBOX_MGMT.SETTINGS_POPUP.ENABLE_CONTINUITY_VIA_EMAIL')}
                            description={t('INBOX_MGMT.SETTINGS_POPUP.ENABLE_CONTINUITY_VIA_EMAIL_SUB_TEXT')}
                            editor={draft.continuityViaEmail ? senderNameSection : undefined}
                        />
                    ) : null}
                </SettingsAccordion>

                <SettingsSaveBar
                    isDirty={isDirty || avatarFile !== null}
                    isSaving={isSaving}
                    isSaveBlocked={webhookUrlInvalid}
                    onCancel={discardChanges}
                    onSave={() => void updateInbox()}
                />
            </div>

            {hasWidgetSettings ? (
                <div className="flex-1 sticky top-4 self-start max-w-lg flex-shrink-0 w-full min-w-0">
                    <PreviewPane
                        websiteToken={inbox.website_token ?? ''}
                        websiteName={draft.name}
                        widgetColor={draft.widgetColor}
                        welcomeTitle={draft.welcomeTitle}
                        welcomeTagline={draft.welcomeTagline}
                        widgetSettings={inbox.widget_settings ?? DEFAULT_WIDGET_SETTINGS}
                    />
                    <p className="mt-2 text-center text-label-small text-n-slate-11">
                        {t('INBOX_MGMT.SETTINGS_POPUP.EMBED_SCRIPT.HINT_IN_BUILDER')}
                    </p>
                </div>
            ) : null}
        </div>
    );
}
