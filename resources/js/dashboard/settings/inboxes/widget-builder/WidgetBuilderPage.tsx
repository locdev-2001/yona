import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import Dashboard from '../../../Dashboard';
import Loader from 'shared/components/loader/Loader';
import { useAlert } from 'dashboard/composables/useAlert';
import { getJson, parseApiErrorMessage, patchJson } from 'dashboard/helper/apiClient';
import BuilderHeader from './components/BuilderHeader';
import BuilderNav from './components/BuilderNav';
import PreviewPane from './components/PreviewPane';
import { buildSavePayload, draftFromInbox, draftsEqual, fieldErrorsOf, flattenFieldErrors, sectionForFieldError } from './draft';
import AiSection from './sections/AiSection';
import AppearanceSection from './sections/AppearanceSection';
import CaptureSection from './sections/CaptureSection';
import ChannelsSection from './sections/ChannelsSection';
import EmbedSection from './sections/EmbedSection';
import HomeSection from './sections/HomeSection';
import InviteSection from './sections/InviteSection';
import { useUnsavedChangesGuard } from '../settingsDraft/useUnsavedChangesGuard';
import { visibleWidgetBuilderSections } from './types';
import type { WidgetBuilderFieldErrors, WidgetBuilderSectionId, WidgetDraft } from './types';
import type { Inbox } from '../types';
import type { DashboardPageProps } from '../../../types';

interface WidgetBuilderPageProps {
    inboxId: number;
}

// Màn "Widget chat" — một bản nháp, một nút Lưu thay đổi. Nav trái là neo cuộn
// tới thẻ tương ứng ở cột giữa (mọi thẻ luôn nằm sẵn trong DOM), cột phải là
// khung xem trước bằng chính widget thật qua iframe `/widget?preview=1`.
export default function WidgetBuilderPage({ inboxId }: WidgetBuilderPageProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;
    const visibleSections = visibleWidgetBuilderSections();

    const [inbox, setInbox] = useState<Inbox | null>(null);
    const [draft, setDraft] = useState<WidgetDraft | null>(null);
    const [savedDraft, setSavedDraft] = useState<WidgetDraft | null>(null);
    const [activeSection, setActiveSection] = useState<WidgetBuilderSectionId>('appearance');
    const [isSaving, setSaving] = useState(false);
    const [serverErrors, setServerErrors] = useState<WidgetBuilderFieldErrors>({});
    const [accountLocale, setAccountLocale] = useState(currentAccount!.locale);
    const [savedAccountLocale, setSavedAccountLocale] = useState(currentAccount!.locale);

    const syncInbox = (nextInbox: Inbox) => {
        setInbox(nextInbox);
        const nextDraft = draftFromInbox(nextInbox);
        setDraft(nextDraft);
        setSavedDraft(nextDraft);
    };

    useEffect(() => {
        void getJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`).then(syncInbox);
    }, [accountId, inboxId]);

    const isDraftDirty = Boolean(draft && savedDraft && !draftsEqual(draft, savedDraft));
    const isAccountLocaleDirty = accountLocale !== savedAccountLocale;
    const isDirty = isDraftDirty || isAccountLocaleDirty;
    useUnsavedChangesGuard(isDirty, t('SETTINGS_DRAFT.CONFIRM_LEAVE'));

    // Dispatch không null-able cho các thẻ con: chỉ được render sau khi draft đã
    // nạp xong, nhưng kiểu của state vẫn `WidgetDraft | null` vì lúc đang tải
    // chưa có gì để đưa vào form.
    const patchDraft: Dispatch<SetStateAction<WidgetDraft>> = updater => {
        setDraft(current => {
            if (!current) return current;

            return typeof updater === 'function' ? (updater as (value: WidgetDraft) => WidgetDraft)(current) : updater;
        });
    };

    const scrollToSection = (sectionId: WidgetBuilderSectionId) => {
        setActiveSection(sectionId);
        // jsdom (vitest) không cài scrollIntoView — gọi an toàn để test không vỡ.
        document.getElementById(sectionId)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    };

    const handleCancel = () => {
        if (!savedDraft) return;
        setDraft(savedDraft);
        setAccountLocale(savedAccountLocale);
        setServerErrors({});
    };

    const handleSave = async () => {
        if (!draft) return;
        setSaving(true);
        try {
            if (isAccountLocaleDirty) {
                await patchJson(`/api/v1/accounts/${accountId}`, { locale: accountLocale });
                setSavedAccountLocale(accountLocale);
            }
            if (isDraftDirty) {
                const updated = await patchJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`, buildSavePayload(draft));
                syncInbox(updated);
            }
            setServerErrors({});
            useAlert(t('WIDGET_BUILDER.HEADER.SAVE_SUCCESS'));
        } catch (error) {
            const rawErrors = fieldErrorsOf(error);
            if (rawErrors) {
                const flattened = flattenFieldErrors(rawErrors);
                setServerErrors(flattened);
                const [firstErrorKey] = Object.keys(flattened);
                if (firstErrorKey) scrollToSection(sectionForFieldError(firstErrorKey));
            }
            useAlert(parseApiErrorMessage(error) || t('WIDGET_BUILDER.HEADER.SAVE_ERROR'));
        } finally {
            setSaving(false);
        }
    };

    if (!inbox || !draft) {
        return (
            <Dashboard>
                <div className="flex items-center justify-center h-full w-full">
                    <Loader size={28} className="text-n-blue-9" />
                </div>
            </Dashboard>
        );
    }

    return (
        <Dashboard>
            <div className="flex flex-col h-full w-full min-w-0 bg-n-surface-1">
                <BuilderHeader
                    accountId={accountId}
                    inboxId={inbox.id}
                    inboxName={inbox.name}
                    isDirty={isDirty}
                    isSaving={isSaving}
                    onCancel={handleCancel}
                    onSave={() => void handleSave()}
                />
                <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
                    <div className="flex flex-col lg:flex-row lg:h-full min-w-0">
                        <div className="shrink-0 px-4 pt-4 lg:px-6 lg:pt-6 lg:w-64">
                            <BuilderNav
                                activeSection={activeSection}
                                onSelect={scrollToSection}
                                orientation="horizontal"
                                className="lg:hidden pb-3 mb-1"
                            />
                            <BuilderNav
                                activeSection={activeSection}
                                onSelect={scrollToSection}
                                orientation="vertical"
                                className="hidden lg:flex"
                            />
                        </div>

                        <div className="flex-1 min-w-0 lg:h-full lg:overflow-y-auto px-4 lg:px-6 py-4 lg:py-6">
                            <div className="flex flex-col gap-5 max-w-3xl mx-auto lg:mx-0">
                                <AppearanceSection
                                    draft={draft}
                                    setDraft={patchDraft}
                                    accountLocale={accountLocale}
                                    onAccountLocaleChange={setAccountLocale}
                                />
                                <HomeSection
                                    accountId={accountId}
                                    draft={draft}
                                    setDraft={patchDraft}
                                    helpCenter={inbox.help_center ?? null}
                                />
                                <ChannelsSection draft={draft} setDraft={patchDraft} errors={serverErrors} />
                                <CaptureSection draft={draft} setDraft={patchDraft} />
                                {visibleSections.includes('invite') ? <InviteSection accountId={accountId} inboxId={inbox.id} /> : null}
                                {visibleSections.includes('ai') ? <AiSection /> : null}
                                <EmbedSection embedScript={inbox.web_widget_script ?? ''} draft={draft} setDraft={patchDraft} />
                            </div>
                        </div>

                        <div className="shrink-0 lg:w-[26rem] px-4 lg:px-6 py-4 lg:py-6">
                            {/* Widget đọc ngôn ngữ của tài khoản lúc nạp: đổi xong thì nạp lại khung xem trước. */}
                            <PreviewPane
                                key={savedAccountLocale}
                                websiteToken={inbox.website_token ?? ''}
                                websiteName={draft.name}
                                widgetColor={draft.widgetColor}
                                welcomeTagline={draft.welcomeTagline}
                                widgetSettings={draft.widgetSettings}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Dashboard>
    );
}
