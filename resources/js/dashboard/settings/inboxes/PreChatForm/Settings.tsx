import { useMemo } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { patchJson } from 'dashboard/helper/apiClient';
import { getPreChatFields } from 'dashboard/helper/preChat';
import type { PreChatField, PreChatFormOptions } from 'dashboard/helper/preChat';
import Icon from 'dashboard/components-next/icon/Icon';
import SettingsToggleSection from 'dashboard/components-next/Settings/SettingsToggleSection';
import WootMessageEditor from 'dashboard/components/widgets/WootWriter/Editor';
import PreChatFields from './PreChatFields';
import SettingsSaveBar from '../settingsDraft/SettingsSaveBar';
import { useSettingsDraft } from '../settingsDraft/useSettingsDraft';
import type { UISettings } from 'dashboard/composables/useUISettings';
import type { DashboardPageProps } from '../../../types';
import type { Inbox } from '../types';

// Port từ settings/inbox/PreChatForm/Settings.vue.
// `attributes/getAttributes` (thuộc tính tuỳ biến) chưa có endpoint ở bản port
// nên danh sách trường tuỳ biến rỗng — trường chuẩn vẫn đủ.
interface PreChatFormSettingsProps {
    inbox: Inbox;
    uiSettings: UISettings;
    onInboxUpdated: (inbox: Inbox) => void;
}

export default function PreChatFormSettings({ inbox, uiSettings, onInboxUpdated }: PreChatFormSettingsProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const preChatFieldOptions = useMemo(
        () =>
            getPreChatFields({
                preChatFormOptions: (inbox.pre_chat_form_options ?? {}) as PreChatFormOptions,
                customAttributes: [],
                defaults: inbox.pre_chat_form_defaults as PreChatFormOptions | null | undefined,
            }),
        [inbox.pre_chat_form_options, inbox.pre_chat_form_defaults],
    );

    const { draft, patchDraft, isDirty, isSaving, reset, save } = useSettingsDraft({
        preChatFormEnabled: Boolean(inbox.pre_chat_form_enabled),
        preChatMessage: preChatFieldOptions.pre_chat_message ?? '',
        preChatFields: preChatFieldOptions.pre_chat_fields,
    });
    const { preChatFormEnabled, preChatMessage, preChatFields } = draft;

    const hasNoEnabledField = preChatFormEnabled && !preChatFields.some(field => field.enabled);

    const patchField = (name: string, patch: Partial<PreChatField>) =>
        patchDraft({ preChatFields: preChatFields.map(field => (field.name === name ? { ...field, ...patch } : field)) });

    const updateInbox = () =>
        save(async () => {
            try {
                const updated = await patchJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inbox.id}`, {
                    channel: {
                        pre_chat_form_enabled: preChatFormEnabled,
                        pre_chat_form_options: {
                            pre_chat_message: preChatMessage,
                            pre_chat_fields: preChatFields,
                        },
                    },
                });
                onInboxUpdated(updated);
                useAlert(t('INBOX_MGMT.EDIT.API.SUCCESS_MESSAGE'));
                return true;
            } catch {
                useAlert(t('INBOX_MGMT.EDIT.API.ERROR_MESSAGE'));
                return false;
            }
        });

    return (
        <div className="mx-6">
            <SettingsToggleSection
                value={preChatFormEnabled}
                onChange={enabled => patchDraft({ preChatFormEnabled: enabled })}
                header={t('INBOX_MGMT.PRE_CHAT_FORM.ENABLE.LABEL')}
                description={t('INBOX_MGMT.PRE_CHAT_FORM.DESCRIPTION')}
                editor={
                    preChatFormEnabled ? (
                        <WootMessageEditor
                            editorId={`pre-chat-message-${inbox.id}`}
                            value={preChatMessage}
                            placeholder={t('INBOX_MGMT.PRE_CHAT_FORM.PRE_CHAT_MESSAGE.PLACEHOLDER')}
                            uiSettings={uiSettings}
                            onChange={message => patchDraft({ preChatMessage: message })}
                        />
                    ) : undefined
                }
            />
            {preChatFormEnabled ? (
                <div className="flex items-center my-8 py-1">
                    <div className="flex-1 h-px bg-n-weak" />
                    <span className="text-body-main text-n-slate-11 px-2">
                        {t('INBOX_MGMT.PRE_CHAT_FORM.SET_FIELDS')}
                    </span>
                    <div className="flex-1 h-px bg-n-weak" />
                </div>
            ) : null}
            <div className="flex flex-col">
                {hasNoEnabledField ? (
                    <p
                        role="status"
                        className="flex items-start gap-2 mb-4 rounded-xl bg-n-amber-3 text-n-amber-12 px-4 py-3 text-body-main"
                    >
                        <Icon icon="i-lucide-triangle-alert" className="size-4 mt-0.5 flex-shrink-0" />
                        {t('INBOX_MGMT.PRE_CHAT_FORM.NO_FIELD_ENABLED_WARNING')}
                    </p>
                ) : null}
                {preChatFormEnabled ? (
                    <PreChatFields
                        preChatFields={preChatFields}
                        onToggle={(type, field) => patchField(field.name, { [type]: !field[type] })}
                        onEdit={(type, field, value) => patchField(field.name, { [type]: value })}
                        onReorder={fields => patchDraft({ preChatFields: fields })}
                    />
                ) : null}
            </div>
            <SettingsSaveBar isDirty={isDirty} isSaving={isSaving} onCancel={reset} onSave={() => void updateInbox()} />
        </div>
    );
}
