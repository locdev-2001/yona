import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import ComboBox from 'dashboard/components-next/combobox/ComboBox';
import Input from 'dashboard/components-next/input/Input';
import TextArea from 'dashboard/components-next/textarea/TextArea';
import ModalHeader from 'dashboard/components/ModalHeader';
import { useAlert } from 'dashboard/composables/useAlert';
import { getJson } from 'dashboard/helper/apiClient';
import { INBOX_TYPES } from 'dashboard/helper/inbox';
import { uploadFile } from 'dashboard/helper/uploadHelper';
import WidgetUpdatePreview from './WidgetUpdatePreview';
import { CTA_LABEL_MAX_LENGTH, TITLE_MAX_LENGTH, widgetUpdateFormErrors } from './validations';
import { WIDGET_UPDATE_TAGS } from './types';
import type { WidgetUpdateFormValues, WidgetUpdateTag } from './types';
import type { DashboardPageProps } from '../../types';

const MAXIMUM_COVER_UPLOAD_SIZE_MB = 4;

const TAG_LABEL_KEY: Record<WidgetUpdateTag, string> = {
    promo: 'WIDGET.UPDATES.TAG.PROMO',
    new: 'WIDGET.UPDATES.TAG.NEW',
    notice: 'WIDGET.UPDATES.TAG.NOTICE',
};

interface InboxOption {
    id: number;
    name: string;
    channel_type: string;
}

interface WidgetUpdateFormProps {
    headerTitle: string;
    headerContent?: string;
    initialValues: WidgetUpdateFormValues;
    isSavingDraft: boolean;
    isPublishing: boolean;
    onSaveDraft: (values: WidgetUpdateFormValues) => void;
    onPublish: (values: WidgetUpdateFormValues) => void;
    onClose: () => void;
}

export default function WidgetUpdateForm({
    headerTitle,
    headerContent = '',
    initialValues,
    isSavingDraft,
    isPublishing,
    onSaveDraft,
    onPublish,
    onClose,
}: WidgetUpdateFormProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [values, setValues] = useState<WidgetUpdateFormValues>(initialValues);
    const [isTouched, setTouched] = useState(false);
    const [isUploadingCover, setUploadingCover] = useState(false);
    const [inboxes, setInboxes] = useState<InboxOption[]>([]);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const patch = (patchValues: Partial<WidgetUpdateFormValues>) => setValues(current => ({ ...current, ...patchValues }));

    // inboxes/getWebsiteInboxes — bài cập nhật chỉ hiện được ở hộp thư Website.
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

    const errors = useMemo(() => widgetUpdateFormErrors(values), [values]);
    const visibleErrors = isTouched ? errors : {};
    const isSubmitDisabled = Object.keys(errors).length > 0 || isSavingDraft || isPublishing || isUploadingCover;

    const handleCoverUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        if (file.size / (1024 * 1024) > MAXIMUM_COVER_UPLOAD_SIZE_MB) {
            useAlert(t('WIDGET_UPDATES_MGMT.FORM.COVER.UPLOAD_ERROR'));
            return;
        }

        setUploadingCover(true);
        try {
            const { fileUrl } = await uploadFile(file, accountId);
            if (fileUrl) patch({ coverUrl: fileUrl });
        } catch {
            useAlert(t('WIDGET_UPDATES_MGMT.FORM.COVER.UPLOAD_ERROR'));
        } finally {
            setUploadingCover(false);
        }
    };

    const submit = (action: (formValues: WidgetUpdateFormValues) => void) => {
        setTouched(true);
        if (Object.keys(widgetUpdateFormErrors(values)).length > 0) return;
        action(values);
    };

    return (
        <div className="flex flex-col h-auto overflow-auto">
            <ModalHeader headerTitle={headerTitle} headerContent={headerContent} />
            <div className="flex flex-col gap-6 px-8 pb-6 lg:flex-row">
                <form className="flex flex-col flex-1 min-w-0 gap-4" onSubmit={event => event.preventDefault()}>
                    <Input
                        value={values.title}
                        maxLength={TITLE_MAX_LENGTH}
                        data-testid="widget-update-title"
                        label={t('WIDGET_UPDATES_MGMT.FORM.TITLE.LABEL')}
                        placeholder={t('WIDGET_UPDATES_MGMT.FORM.TITLE.PLACEHOLDER')}
                        message={visibleErrors.title ? t(visibleErrors.title) : ''}
                        messageType={visibleErrors.title ? 'error' : 'info'}
                        onChange={event => patch({ title: event.target.value })}
                    />

                    <div className="flex flex-col gap-1">
                        <span className="mb-0.5 text-sm font-medium text-n-slate-12">{t('WIDGET_UPDATES_MGMT.FORM.TAG.LABEL')}</span>
                        <div className="flex flex-wrap gap-2">
                            {WIDGET_UPDATE_TAGS.map(tag => (
                                <Button
                                    key={tag}
                                    type="button"
                                    size="sm"
                                    variant={values.tag === tag ? 'solid' : 'faded'}
                                    color="slate"
                                    label={t(TAG_LABEL_KEY[tag])}
                                    onClick={() => patch({ tag })}
                                />
                            ))}
                        </div>
                    </div>

                    <TextArea
                        value={values.body}
                        label={t('WIDGET_UPDATES_MGMT.FORM.BODY.LABEL')}
                        placeholder={t('WIDGET_UPDATES_MGMT.FORM.BODY.PLACEHOLDER')}
                        message={visibleErrors.body ? t(visibleErrors.body) : ''}
                        messageType={visibleErrors.body ? 'error' : 'info'}
                        autoHeight
                        minHeight="6rem"
                        onChange={value => patch({ body: value })}
                    />

                    <div className="flex flex-col gap-1">
                        <span className="mb-0.5 text-sm font-medium text-n-slate-12">{t('WIDGET_UPDATES_MGMT.FORM.COVER.LABEL')}</span>
                        <div className="flex items-center gap-3">
                            {values.coverUrl ? (
                                <img src={values.coverUrl} alt="" className="object-cover w-20 h-12 rounded-lg" />
                            ) : null}
                            <Button
                                type="button"
                                variant="faded"
                                color="slate"
                                size="sm"
                                isLoading={isUploadingCover}
                                label={
                                    values.coverUrl
                                        ? t('WIDGET_UPDATES_MGMT.FORM.COVER.REPLACE_BTN')
                                        : t('WIDGET_UPDATES_MGMT.FORM.COVER.UPLOAD_BTN')
                                }
                                onClick={() => coverInputRef.current?.click()}
                            />
                            {values.coverUrl ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    color="ruby"
                                    size="sm"
                                    label={t('WIDGET_UPDATES_MGMT.FORM.COVER.REMOVE_BTN')}
                                    onClick={() => patch({ coverUrl: '' })}
                                />
                            ) : null}
                            <input
                                ref={coverInputRef}
                                type="file"
                                accept="image/png, image/jpeg, image/jpg, image/webp"
                                className="hidden"
                                onChange={event => void handleCoverUpload(event)}
                            />
                        </div>
                    </div>

                    <Input
                        value={values.ctaLabel}
                        maxLength={CTA_LABEL_MAX_LENGTH}
                        label={t('WIDGET_UPDATES_MGMT.FORM.CTA_LABEL.LABEL')}
                        placeholder={t('WIDGET_UPDATES_MGMT.FORM.CTA_LABEL.PLACEHOLDER')}
                        message={visibleErrors.ctaLabel ? t(visibleErrors.ctaLabel) : ''}
                        messageType={visibleErrors.ctaLabel ? 'error' : 'info'}
                        onChange={event => patch({ ctaLabel: event.target.value })}
                    />

                    <Input
                        value={values.ctaUrl}
                        type="url"
                        label={t('WIDGET_UPDATES_MGMT.FORM.CTA_URL.LABEL')}
                        placeholder={t('WIDGET_UPDATES_MGMT.FORM.CTA_URL.PLACEHOLDER')}
                        message={visibleErrors.ctaUrl ? t(visibleErrors.ctaUrl) : ''}
                        messageType={visibleErrors.ctaUrl ? 'error' : 'info'}
                        onChange={event => patch({ ctaUrl: event.target.value })}
                    />

                    <div className="flex flex-col gap-1">
                        <label htmlFor="widget-update-inbox" className="mb-0.5 text-sm font-medium text-n-slate-12">
                            {t('WIDGET_UPDATES_MGMT.FORM.INBOX.LABEL')}
                        </label>
                        <ComboBox
                            value={values.inboxId ? String(values.inboxId) : ''}
                            options={inboxes.map(inbox => ({ value: String(inbox.id), label: inbox.name }))}
                            placeholder={t('WIDGET_UPDATES_MGMT.FORM.INBOX.PLACEHOLDER')}
                            onChange={value => patch({ inboxId: value ? Number(value) : null })}
                        />
                    </div>

                    <div className="flex items-center justify-end w-full gap-2 pt-2">
                        <Button
                            type="button"
                            variant="faded"
                            color="slate"
                            label={t('WIDGET_UPDATES_MGMT.FORM.CANCEL')}
                            disabled={isSavingDraft || isPublishing}
                            onClick={onClose}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            color="slate"
                            data-testid="save-draft-btn"
                            label={t('WIDGET_UPDATES_MGMT.FORM.SAVE_DRAFT')}
                            isLoading={isSavingDraft}
                            disabled={isSubmitDisabled}
                            onClick={() => submit(onSaveDraft)}
                        />
                        <Button
                            type="button"
                            data-testid="publish-btn"
                            label={t('WIDGET_UPDATES_MGMT.FORM.PUBLISH')}
                            isLoading={isPublishing}
                            disabled={isSubmitDisabled}
                            onClick={() => submit(onPublish)}
                        />
                    </div>
                </form>

                <div className="flex-none lg:w-[380px]">
                    <WidgetUpdatePreview values={values} />
                </div>
            </div>
        </div>
    );
}
