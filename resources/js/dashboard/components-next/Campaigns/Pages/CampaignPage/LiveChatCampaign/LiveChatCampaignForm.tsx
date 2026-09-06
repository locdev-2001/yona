import { useEffect, useImperativeHandle, useMemo, useState } from 'react';
import type { FormEvent, Ref } from 'react';
import { usePage } from '@inertiajs/react';
import { URLPattern } from 'urlpattern-polyfill';

import Button from 'dashboard/components-next/button/Button';
import ComboBox from 'dashboard/components-next/combobox/ComboBox';
import Editor from 'dashboard/components-next/Editor/Editor';
import Input from 'dashboard/components-next/input/Input';
import { useAlert } from 'dashboard/composables/useAlert';
import { getJson, parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { INBOX_TYPES } from 'dashboard/helper/inbox';
import type { UISettings } from 'dashboard/composables/useUISettings';

import { t } from '../../../../../../i18n';
import type { Campaign, LiveChatCampaignPayload } from '../../../types';
import type { DashboardPageProps } from '../../../../../types';

// Port từ components-next/Campaigns/Pages/CampaignPage/LiveChatCampaign/LiveChatCampaignForm.vue.
// vuelidate → kiểm tra thuần trong `formErrors` (cùng lối CannedForm của B-group).

const BOT_SENDER_ID = 0;

interface FormState {
    title: string;
    message: string;
    inboxId: number | null;
    senderId: number;
    enabled: boolean;
    triggerOnlyDuringBusinessHours: boolean;
    endPoint: string;
    timeOnPage: string;
}

const INITIAL_STATE: FormState = {
    title: '',
    message: '',
    inboxId: null,
    senderId: BOT_SENDER_ID,
    enabled: true,
    triggerOnlyDuringBusinessHours: false,
    endPoint: '',
    timeOnPage: '10',
};

// urlValidators của bản gốc: phải parse được thành URLPattern VÀ bắt đầu bằng http(s).
export function isValidCampaignUrl(value: string): boolean {
    if (!value) return false;
    if (!value.startsWith('http://') && !value.startsWith('https://')) return false;

    try {
        // eslint-disable-next-line no-new
        new URLPattern(value);
        return true;
    } catch {
        return false;
    }
}

export function campaignFormErrors(state: FormState): Record<string, string> {
    const baseKey = 'CAMPAIGN.LIVE_CHAT.CREATE.FORM';

    return {
        ...(state.title.trim() ? {} : { title: t(`${baseKey}.TITLE.ERROR`) }),
        ...(state.message.trim() ? {} : { message: t(`${baseKey}.MESSAGE.ERROR`) }),
        ...(state.inboxId ? {} : { inbox: t(`${baseKey}.INBOX.ERROR`) }),
        ...(isValidCampaignUrl(state.endPoint) ? {} : { endPoint: t(`${baseKey}.END_POINT.ERROR`) }),
        ...(state.timeOnPage !== '' ? {} : { timeOnPage: t(`${baseKey}.TIME_ON_PAGE.ERROR`) }),
    };
}

export interface LiveChatCampaignFormHandle {
    prepareCampaignDetails: () => LiveChatCampaignPayload;
}

interface InboxOption {
    id: number;
    name: string;
    channel_type: string;
}

interface LiveChatCampaignFormProps {
    mode: 'create' | 'edit';
    selectedCampaign?: Campaign | null;
    showActionButtons?: boolean;
    isCreating?: boolean;
    // Khi nhúng trong Dialog, Dialog mới là <form> — chỗ này render <div> để
    // tránh form lồng nhau (React bỏ qua onSubmit của form bên trong).
    embedded?: boolean;
    ref?: Ref<LiveChatCampaignFormHandle>;
    onSubmit: (payload: LiveChatCampaignPayload) => void;
    onCancel?: () => void;
    // `defineExpose({ isSubmitDisabled })` của bản gốc: hộp thoại sửa đọc trạng
    // thái hợp lệ để khoá nút xác nhận — ở React đẩy ngược ra bằng callback.
    onValidityChange?: (isSubmitDisabled: boolean) => void;
}

export default function LiveChatCampaignForm({
    mode,
    selectedCampaign = null,
    showActionButtons = true,
    isCreating = false,
    embedded = false,
    ref,
    onSubmit,
    onCancel,
    onValidityChange,
}: LiveChatCampaignFormProps) {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;
    const uiSettings = (auth.user?.ui_settings ?? {}) as UISettings;

    const [state, setState] = useState<FormState>(INITIAL_STATE);
    const [isSubmitted, setSubmitted] = useState(false);
    const [inboxes, setInboxes] = useState<InboxOption[]>([]);
    const [senders, setSenders] = useState<{ id: number; name: string }[]>([]);

    const patch = (values: Partial<FormState>) => setState(current => ({ ...current, ...values }));

    // inboxes/getWebsiteInboxes — chỉ inbox kênh Website nhận campaign live chat.
    useEffect(() => {
        let active = true;
        getJson<{ payload: InboxOption[] }>(`/api/v1/accounts/${accountId}/inboxes`)
            .then(response => {
                if (active) setInboxes(response.payload.filter(inbox => inbox.channel_type === INBOX_TYPES.WEB));
            })
            .catch(() => {
                if (active) setInboxes([]);
            });

        return () => {
            active = false;
        };
    }, [accountId]);

    // watch state.inboxId — người gửi phải là thành viên của chính inbox đó.
    useEffect(() => {
        if (!state.inboxId) {
            setSenders([]);
            return undefined;
        }

        let active = true;
        getJson<{ payload: { id: number; name: string }[] }>(
            `/api/v1/accounts/${accountId}/inbox_members/${state.inboxId}`,
        )
            .then(response => {
                if (active) setSenders(response.payload ?? []);
            })
            .catch(error => {
                if (!active) return;
                setSenders([]);
                useAlert(parseApiErrorMessage(error) ?? t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.API.ERROR_MESSAGE'));
            });

        return () => {
            active = false;
        };
    }, [accountId, state.inboxId]);

    // watch selectedCampaign — nạp lại form mỗi lần mở hộp thoại sửa.
    useEffect(() => {
        if (mode !== 'edit' || !selectedCampaign) return;

        setState({
            title: selectedCampaign.title,
            message: selectedCampaign.message,
            inboxId: selectedCampaign.inbox?.id ?? null,
            senderId: (selectedCampaign.sender as { id?: number })?.id ?? BOT_SENDER_ID,
            enabled: selectedCampaign.enabled,
            triggerOnlyDuringBusinessHours: selectedCampaign.trigger_only_during_business_hours,
            endPoint: selectedCampaign.trigger_rules?.url ?? '',
            timeOnPage: String(selectedCampaign.trigger_rules?.time_on_page ?? ''),
        });
    }, [mode, selectedCampaign]);

    const errors = useMemo(() => campaignFormErrors(state), [state]);
    const visibleErrors = isSubmitted ? errors : {};
    const isSubmitDisabled = Object.keys(errors).length > 0;

    const prepareCampaignDetails = (): LiveChatCampaignPayload => ({
        title: state.title,
        message: state.message,
        inbox_id: state.inboxId,
        sender_id: state.senderId || null,
        enabled: state.enabled,
        trigger_only_during_business_hours: state.triggerOnlyDuringBusinessHours,
        trigger_rules: { url: state.endPoint, time_on_page: Number(state.timeOnPage) },
    });

    useImperativeHandle(ref, () => ({ prepareCampaignDetails }));

    useEffect(() => onValidityChange?.(isSubmitDisabled), [isSubmitDisabled, onValidityChange]);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        setSubmitted(true);
        if (isSubmitDisabled) return;

        onSubmit(prepareCampaignDetails());
        if (mode === 'create') {
            setState(INITIAL_STATE);
            setSubmitted(false);
            onCancel?.();
        }
    };

    const comboBoxClass =
        '[&>div>button]:bg-n-alpha-black2 [&>div>button:not(.focused)]:dark:outline-n-weak [&>div>button:not(.focused)]:hover:!outline-n-slate-6';

    const Container = embedded ? 'div' : 'form';

    return (
        <Container className="flex flex-col gap-4" onSubmit={embedded ? undefined : handleSubmit}>
            <Input
                value={state.title}
                onChange={event => patch({ title: event.target.value })}
                label={t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.TITLE.LABEL')}
                placeholder={t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.TITLE.PLACEHOLDER')}
                message={visibleErrors.title ?? ''}
                messageType={visibleErrors.title ? 'error' : 'info'}
            />

            <Editor
                value={state.message}
                onChange={value => patch({ message: value })}
                uiSettings={uiSettings}
                label={t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.MESSAGE.LABEL')}
                placeholder={t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.MESSAGE.PLACEHOLDER')}
                message={visibleErrors.message ?? ''}
                messageType={visibleErrors.message ? 'error' : 'info'}
            />

            <div className="flex flex-col gap-1">
                <label htmlFor="inbox" className="mb-0.5 text-sm font-medium text-n-slate-12">
                    {t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.INBOX.LABEL')}
                </label>
                <ComboBox
                    value={state.inboxId ? String(state.inboxId) : ''}
                    options={inboxes.map(inbox => ({ value: String(inbox.id), label: inbox.name }))}
                    hasError={Boolean(visibleErrors.inbox)}
                    placeholder={t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.INBOX.PLACEHOLDER')}
                    message={visibleErrors.inbox ?? ''}
                    className={comboBoxClass}
                    onChange={value => patch({ inboxId: value ? Number(value) : null, senderId: BOT_SENDER_ID })}
                />
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="sentBy" className="mb-0.5 text-sm font-medium text-n-slate-12">
                    {t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.SENT_BY.LABEL')}
                </label>
                <ComboBox
                    value={String(state.senderId)}
                    options={[
                        { value: String(BOT_SENDER_ID), label: 'Bot' },
                        ...senders.map(sender => ({ value: String(sender.id), label: sender.name })),
                    ]}
                    disabled={!state.inboxId}
                    placeholder={t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.SENT_BY.PLACEHOLDER')}
                    className={comboBoxClass}
                    onChange={value => patch({ senderId: Number(value) })}
                />
            </div>

            <Input
                value={state.endPoint}
                onChange={event => patch({ endPoint: event.target.value })}
                type="url"
                label={t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.END_POINT.LABEL')}
                placeholder={t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.END_POINT.PLACEHOLDER')}
                message={visibleErrors.endPoint ?? ''}
                messageType={visibleErrors.endPoint ? 'error' : 'info'}
            />

            <Input
                value={state.timeOnPage}
                onChange={event => patch({ timeOnPage: event.target.value })}
                type="number"
                label={t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.TIME_ON_PAGE.LABEL')}
                placeholder={t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.TIME_ON_PAGE.PLACEHOLDER')}
                message={visibleErrors.timeOnPage ?? ''}
                messageType={visibleErrors.timeOnPage ? 'error' : 'info'}
            />

            <fieldset className="flex flex-col gap-2.5">
                <legend className="mb-2.5 text-sm font-medium text-n-slate-12">
                    {t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.OTHER_PREFERENCES.TITLE')}
                </legend>

                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={state.enabled}
                        onChange={event => patch({ enabled: event.target.checked })}
                    />
                    <span className="text-sm font-medium text-n-slate-12">
                        {t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.OTHER_PREFERENCES.ENABLED')}
                    </span>
                </label>

                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={state.triggerOnlyDuringBusinessHours}
                        onChange={event => patch({ triggerOnlyDuringBusinessHours: event.target.checked })}
                    />
                    <span className="text-sm font-medium text-n-slate-12">
                        {t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.OTHER_PREFERENCES.TRIGGER_ONLY_BUSINESS_HOURS')}
                    </span>
                </label>
            </fieldset>

            {showActionButtons ? (
                <div className="flex items-center justify-between w-full gap-3">
                    <Button
                        type="button"
                        variant="faded"
                        color="slate"
                        label={t('CAMPAIGN.LIVE_CHAT.CREATE.FORM.BUTTONS.CANCEL')}
                        className="w-full bg-n-alpha-2 text-n-blue-11 hover:bg-n-alpha-3"
                        onClick={onCancel}
                    />
                    <Button
                        type="submit"
                        label={t(`CAMPAIGN.LIVE_CHAT.CREATE.FORM.BUTTONS.${mode.toUpperCase()}`)}
                        className="w-full"
                        isLoading={isCreating}
                        disabled={isCreating || isSubmitDisabled}
                    />
                </div>
            ) : null}
        </Container>
    );
}
