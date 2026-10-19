import { useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';

import BackButton from 'dashboard/components/widgets/BackButton';
import { useAlert } from 'dashboard/composables/useAlert';
import { conversationListPageURL } from 'dashboard/helper/URLHelper';
import LoaderIcon from 'shared/components/loader/LoaderIcon';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import ReplyBox from '../conversationbox/ReplyBox';
import ChannelPicker from './ChannelPicker';
import RecipientField from './RecipientField';
import { fetchContactMeta, verifyEmailAddress } from './composeApi';
import { inboxNeedsSubject, resolveTarget } from './composeDraft';
import type { ChannelOption, ComposeRecipient } from './composeDraft';
import { useChannelOptions } from './useChannelOptions';

// Khung chat ở chế độ bản nháp: đầu là Đến / Gửi qua / Chủ đề, thân trống, đáy
// là ô soạn chung của Inbox chạy theo năng lực kênh đã chọn. Lần gửi đầu tiên
// tạo hội thoại rồi mở hội thoại đó.
export default function ComposeDraftPane() {
    const { accountId, listFilters, teamId, isOnExpandedLayout, composeContactId, composeDraft, updateComposeDraft } =
        useConversation();
    const { inboxes = [] } = usePage<DashboardPageProps>().props;
    const { recipient, target, subject, emailCheck, showErrors, isSending, error } = composeDraft;
    const channels = useChannelOptions(accountId, recipient, inboxes);

    useEffect(() => {
        if (!composeContactId) return undefined;
        let cancelled = false;
        fetchContactMeta(accountId, composeContactId).then(
            contact => {
                if (!cancelled) updateComposeDraft(draft => (draft.recipient ? {} : { recipient: { kind: 'contact', contact } }));
            },
            () => {
                if (!cancelled) useAlert(t('COMPOSE_NEW_CONVERSATION.DRAFT.CONTACT_LOAD_FAILED'));
            },
        );
        return () => {
            cancelled = true;
        };
    }, [accountId, composeContactId, updateComposeDraft]);

    useEffect(() => {
        if (channels.isLoading) return;
        updateComposeDraft(draft => {
            const next = resolveTarget(channels.options, draft.target);
            return next?.inbox.id === draft.target?.inbox.id && next?.available === draft.target?.available
                ? {}
                : { target: next };
        });
    }, [channels.options, channels.isLoading, updateComposeDraft]);

    const verifiedAddressRef = useRef<string | null>(null);
    const selectRecipient = useCallback(
        (next: ComposeRecipient | null) => {
            const needsEmailCheck = next?.kind === 'new' && next.addressType === 'email';
            verifiedAddressRef.current = needsEmailCheck ? next.address : null;
            updateComposeDraft({
                recipient: next,
                target: null,
                error: null,
                emailCheck: needsEmailCheck ? { status: 'checking' } : { status: 'idle' },
            });
            if (!needsEmailCheck) return;

            const address = next.address;
            verifyEmailAddress(accountId, address).then(
                result => {
                    if (verifiedAddressRef.current !== address) return;
                    updateComposeDraft({
                        emailCheck: result.deliverable
                            ? { status: 'deliverable' }
                            : { status: 'undeliverable', reason: result.reason },
                    });
                },
                () => {
                    // Không kiểm được (mạng): để máy chủ kiểm lại lúc mở hội thoại.
                    if (verifiedAddressRef.current === address) updateComposeDraft({ emailCheck: { status: 'idle' } });
                },
            );
        },
        [accountId, updateComposeDraft],
    );

    const selectChannel = (option: ChannelOption) => {
        if (option.available && !isSending) updateComposeDraft({ target: option, error: null });
    };

    const needsSubject = inboxNeedsSubject(target?.inbox);
    const backUrl = conversationListPageURL({ accountId, filters: listFilters, teamId });

    return (
        <div
            data-testid="compose-draft"
            className="conversation-details-wrap flex flex-col min-w-0 w-full bg-n-surface-canvas relative"
        >
            <div className="flex items-center gap-2 px-4 h-12 xl:h-16 shrink-0 bg-n-surface-panel shadow-bar">
                {isOnExpandedLayout ? <BackButton backUrl={backUrl} className="me-1" /> : null}
                <h2 className="text-sm font-medium text-n-slate-12 truncate">
                    {t('COMPOSE_NEW_CONVERSATION.DRAFT.TITLE')}
                </h2>
            </div>
            <div className="flex flex-col shrink-0 border-b border-n-weak max-h-[55vh] overflow-y-auto">
                <FieldRow label={t('COMPOSE_NEW_CONVERSATION.FORM.CONTACT_SELECTOR.LABEL')}>
                    <RecipientField
                        accountId={accountId}
                        recipient={recipient}
                        emailCheck={emailCheck}
                        hasError={showErrors && !recipient}
                        disabled={isSending}
                        onSelect={selectRecipient}
                    />
                </FieldRow>
                <FieldRow label={t('COMPOSE_NEW_CONVERSATION.FORM.INBOX_SELECTOR.LABEL')}>
                    <ChannelPicker
                        options={channels.options}
                        isLoading={channels.isLoading}
                        loadFailed={channels.loadFailed}
                        hasRecipient={recipient !== null}
                        selectedInboxId={target?.inbox.id ?? null}
                        hasError={showErrors}
                        disabled={isSending}
                        onSelect={selectChannel}
                        onRetry={channels.reload}
                    />
                </FieldRow>
                {needsSubject ? (
                    <FieldRow label={t('COMPOSE_NEW_CONVERSATION.DRAFT.SUBJECT_LABEL')}>
                        <input
                            value={subject}
                            disabled={isSending}
                            aria-label={t('COMPOSE_NEW_CONVERSATION.DRAFT.SUBJECT_LABEL')}
                            placeholder={t('COMPOSE_NEW_CONVERSATION.FORM.EMAIL_OPTIONS.SUBJECT_PLACEHOLDER')}
                            aria-invalid={showErrors && !subject.trim()}
                            onChange={event => updateComposeDraft({ subject: event.target.value })}
                            className={`reset-base w-full h-8 m-0 p-0 text-sm bg-transparent border-0 shadow-none outline-none text-n-slate-12 placeholder:text-n-slate-10 ${
                                showErrors && !subject.trim() ? 'placeholder:!text-n-ruby-9' : ''
                            }`}
                        />
                    </FieldRow>
                ) : null}
            </div>
            <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-2 px-6 text-center">
                {isSending ? (
                    <>
                        <LoaderIcon className="text-n-brand" />
                        <span className="text-sm text-n-slate-11">{t('COMPOSE_NEW_CONVERSATION.DRAFT.SENDING')}</span>
                    </>
                ) : error ? (
                    <span role="alert" className="flex items-start gap-2 max-w-md text-sm text-n-ruby-11">
                        <span className="i-lucide-circle-alert size-4 shrink-0 mt-0.5" aria-hidden="true" />
                        {error}
                    </span>
                ) : (
                    <>
                        <span className="i-lucide-messages-square size-8 text-n-slate-9" aria-hidden="true" />
                        <span className="text-sm text-n-slate-11">{t('COMPOSE_NEW_CONVERSATION.DRAFT.EMPTY')}</span>
                    </>
                )}
            </div>
            <div className="flex relative flex-col bg-n-surface-canvas pb-[env(safe-area-inset-bottom)]">
                <ReplyBox />
            </div>
        </div>
    );
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-start gap-3 px-4 py-2 border-t border-n-weak first:border-t-0">
            <span className="w-16 shrink-0 pt-1.5 text-sm font-medium text-n-slate-11">{label}</span>
            {children}
        </div>
    );
}
