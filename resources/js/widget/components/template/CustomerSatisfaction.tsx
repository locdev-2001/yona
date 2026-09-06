import { useState } from 'react';
import DOMPurify from 'dompurify';

import Spinner from 'shared/components/Spinner';
import StarRating from 'shared/components/StarRating';
import MessageFormatter from 'shared/helpers/MessageFormatter';
import { csatResponseFrom, isCsatFeedbackSubmitted, isCsatRatingSubmitted } from 'shared/helpers/csatHelpers';
import { CSAT_DISPLAY_TYPES, CSAT_RATINGS } from 'shared/constants/messages';

import { getContrastingTextColor } from '../../helpers/colorHelper';
import { t } from '../../i18n';
import { useWidgetState } from '../../store/hooks';
import { widgetStore } from '../../store/widgetStore';
import { ChevronRightIcon } from '../icons';

// Port từ shared/components/CustomerSatisfaction.vue — bong bóng khảo sát trong
// widget. Bản gốc để ở `shared/` nhưng chỉ widget dùng (trang khảo sát công khai
// có bộ component riêng), nên ở đây nằm cùng các bong bóng bot khác.
interface CustomerSatisfactionProps {
    messageId: number | string;
    // Chính là `content_attributes.submitted_values` của tin khảo sát.
    submittedValues?: unknown;
    displayType?: string;
    message?: string;
}

export default function CustomerSatisfaction({
    messageId,
    submittedValues = null,
    displayType = CSAT_DISPLAY_TYPES.EMOJI,
    message = '',
}: CustomerSatisfactionProps) {
    const widgetColor = useWidgetState(state => state.appConfig.widgetColor);
    const submitted = csatResponseFrom(submittedValues);

    const [selectedRating, setSelectedRating] = useState<number | null>(submitted?.rating ?? null);
    const [feedback, setFeedback] = useState(submitted?.feedback_message ?? '');
    const [isUpdating, setUpdating] = useState(false);

    const isRatingSubmitted = isCsatRatingSubmitted(submitted);
    const isFeedbackSubmitted = isCsatFeedbackSubmitted(submitted);
    const isLocked = isFeedbackSubmitted || isUpdating;
    const isButtonDisabled = !(selectedRating && feedback) || isUpdating;
    const textColor = getContrastingTextColor(widgetColor);
    const title = isRatingSubmitted ? t('CSAT.SUBMITTED_TITLE') : message || t('CSAT.TITLE');

    const submit = async (rating: number | null, feedbackMessage: string) => {
        if (isUpdating || rating === null) return;
        setUpdating(true);
        try {
            await widgetStore.updateMessage({
                messageId,
                submittedValues: { csat_survey_response: { rating, feedback_message: feedbackMessage } },
            });
        } finally {
            setUpdating(false);
        }
    };

    const selectRating = (rating: number) => {
        if (isLocked) return;
        setSelectedRating(rating);
        void submit(rating, feedback);
    };

    return (
        <div
            className="customer-satisfaction w-full bg-n-background dark:bg-n-solid-3 shadow-[0_0.25rem_6px_rgba(50,50,93,0.08),0_1px_3px_rgba(0,0,0,0.05)] ltr:rounded-bl-[0.25rem] rtl:rounded-br-[0.25rem] rounded-lg inline-block leading-[1.5] mt-1 border-t-2 border-t-n-brand border-solid"
            style={{ borderColor: widgetColor }}
        >
            <h6
                className="text-n-slate-12 text-sm font-medium pt-5 px-2.5 text-center prose prose-bubble"
                dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(new MessageFormatter(title, false).formattedMessage),
                }}
            />
            {displayType === CSAT_DISPLAY_TYPES.EMOJI ? (
                <div className="ratings flex justify-around py-5 px-4">
                    {CSAT_RATINGS.map(rating => (
                        <button
                            key={rating.key}
                            className={[
                                'emoji-button',
                                rating.value === selectedRating ? 'selected' : '',
                                isLocked ? 'disabled hover' : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            onClick={() => selectRating(rating.value)}
                        >
                            {rating.emoji}
                        </button>
                    ))}
                </div>
            ) : null}
            {displayType === CSAT_DISPLAY_TYPES.STAR ? (
                <StarRating selectedRating={selectedRating} isDisabled={isLocked} onSelectRating={selectRating} />
            ) : null}
            {!isFeedbackSubmitted ? (
                <form
                    className="feedback-form flex"
                    onSubmit={event => {
                        event.preventDefault();
                        void submit(selectedRating, feedback);
                    }}
                >
                    <input
                        value={feedback}
                        placeholder={t('CSAT.PLACEHOLDER')}
                        onChange={event => setFeedback(event.target.value)}
                    />
                    <button
                        className="button small"
                        disabled={isButtonDisabled}
                        style={{ background: widgetColor, borderColor: widgetColor, color: textColor }}
                    >
                        {isUpdating && feedback ? <Spinner /> : <ChevronRightIcon />}
                    </button>
                </form>
            ) : null}
        </div>
    );
}
