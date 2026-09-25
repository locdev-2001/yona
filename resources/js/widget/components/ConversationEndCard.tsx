import { useState } from 'react';

import CsatLevelPicker from 'shared/components/CsatLevelPicker';
import { csatResponseFrom, isCsatRatingSubmitted } from 'shared/helpers/csatHelpers';

import { useWidgetState } from '../store/hooks';
import { widgetStore } from '../store/widgetStore';
import { t } from '../i18n';
import WidgetAvatar from './WidgetAvatar';
import type { WidgetMessage } from '../types';

const MINUTES_IN_HOUR = 60;
const MINUTES_IN_DAY = 24 * 60;

// "Đã hỗ trợ trong …" tính từ lúc mở hội thoại tới lúc gửi phiếu đánh giá.
const supportDurationLabel = (startedAt: number | null, endedAt: number): string | null => {
    if (!startedAt || endedAt < startedAt) return null;

    const minutes = Math.max(1, Math.round((endedAt - startedAt) / 60));
    if (minutes < MINUTES_IN_HOUR) return t('CONVERSATION_END.SUPPORTED_MINUTES', { n: minutes });
    if (minutes < MINUTES_IN_DAY) return t('CONVERSATION_END.SUPPORTED_HOURS', { n: Math.round(minutes / MINUTES_IN_HOUR) });

    return t('CONVERSATION_END.SUPPORTED_DAYS', { n: Math.round(minutes / MINUTES_IN_DAY) });
};

// Kết thúc & đánh giá: phiếu CSAT (tin `input_csat`) hiện thành thẻ riêng trong luồng tin.
export default function ConversationEndCard({ message }: { message: WidgetMessage }) {
    const submitted = csatResponseFrom(message.content_attributes?.submitted_values);
    const isSubmitted = isCsatRatingSubmitted(submitted);
    const assignee = useWidgetState(state => state.conversationAttributes.assignee ?? null);
    const conversationStartedAt = useWidgetState(state => state.conversationAttributes.createdAt ?? null);
    const inboxName = useWidgetState(state => state.channelConfig?.websiteName ?? '');
    const inboxAvatarUrl = useWidgetState(state => state.channelConfig?.avatarUrl ?? '');

    const [selectedRating, setSelectedRating] = useState<number | null>(null);
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setSubmitting] = useState(false);

    const shownRating = isSubmitted ? Number(submitted?.rating) : selectedRating;
    const supportedFor = supportDurationLabel(conversationStartedAt, message.created_at);

    const submit = async () => {
        if (selectedRating === null || isSubmitting) return;
        setSubmitting(true);
        await widgetStore.updateMessage({
            messageId: message.id,
            submittedValues: { csat_survey_response: { rating: selectedRating, feedback_message: feedback.trim() } },
        });
        setSubmitting(false);
    };

    return (
        <section
            data-testid="conversation-end"
            aria-label={t('CONVERSATION_END.TITLE')}
            className="flex flex-col gap-4 mx-4 my-3 px-[18px] py-5 rounded-2xl border border-[var(--yona-chat-line)] bg-[var(--yona-chat-panel)]"
        >
            <div className="flex items-center gap-2.5">
                {assignee ? (
                    <WidgetAvatar name={assignee.name} src={assignee.avatar_url} size={36} tone="agent" />
                ) : (
                    <WidgetAvatar name={inboxName} src={inboxAvatarUrl} size={36} tone="inbox" />
                )}
                <div className="min-w-0">
                    <div className="text-[13.5px] font-semibold leading-[1.3] truncate text-[var(--yona-chat-ink)]">
                        {assignee?.name ?? inboxName}
                    </div>
                    {supportedFor ? (
                        <div className="text-[11.5px] leading-[1.3] text-[var(--yona-chat-ink-muted)]">{supportedFor}</div>
                    ) : null}
                </div>
            </div>
            <h2 className="text-[17px] font-semibold leading-[1.35] text-[var(--yona-chat-ink)]">
                {isSubmitted ? t('CONVERSATION_END.THANKS') : message.content || t('CONVERSATION_END.RATE_PROMPT')}
            </h2>
            <CsatLevelPicker
                rating={shownRating}
                label={t('CONVERSATION_END.RATE_PROMPT')}
                disabled={isSubmitted || isSubmitting}
                onSelect={setSelectedRating}
            />
            {!isSubmitted ? (
                <>
                    <textarea
                        value={feedback}
                        rows={2}
                        aria-label={t('CONVERSATION_END.FEEDBACK_PLACEHOLDER')}
                        placeholder={t('CONVERSATION_END.FEEDBACK_PLACEHOLDER')}
                        className="reset-base w-full min-h-[52px] resize-none rounded-xl border border-[var(--yona-chat-line-field)] bg-transparent px-[13px] py-3 text-[12.5px] leading-[1.4] text-[var(--yona-chat-ink)] placeholder:text-[var(--yona-chat-ink-muted)]"
                        onChange={event => setFeedback(event.target.value)}
                    />
                    <button
                        type="button"
                        disabled={selectedRating === null || isSubmitting}
                        className="w-full min-h-11 p-[13px] rounded-xl text-[13.5px] font-semibold leading-none bg-[var(--yona-chat-solid)] text-[var(--yona-chat-on-solid)] disabled:opacity-40"
                        onClick={() => void submit()}
                    >
                        {t('CONVERSATION_END.SUBMIT')}
                    </button>
                </>
            ) : null}
        </section>
    );
}
