import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';

import Branding from 'shared/components/Branding';
import CsatLevelPicker from 'shared/components/CsatLevelPicker';
import Loader from 'shared/components/loader/Loader';
import MessageFormatter from 'shared/helpers/MessageFormatter';
import { csatSurveyUuidFromUrl, isCsatFeedbackSubmitted, isCsatRatingSubmitted } from 'shared/helpers/csatHelpers';
import type { CsatSurveyResponseValues } from 'shared/helpers/csatHelpers';

import { getSurveyDetails, updateSurvey } from './api';
import type { SurveyDetails } from './api';
import Banner from './components/Banner';
import Feedback from './components/Feedback';
import { t } from './i18n';
import { surveyGlobalConfig } from './globalConfig';

// Trang khảo sát CSAT công khai (link/email): cùng ba nút Kém/Ổn/Tuyệt và cùng quy đổi
// 1/3/5 với thẻ đánh giá trong widget.
const surveyUuid = () => csatSurveyUuidFromUrl(window.location.href);

export default function Response() {
    const [isLoading, setLoading] = useState(true);
    const [isUpdating, setUpdating] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [details, setDetails] = useState<SurveyDetails | null>(null);
    const [submitted, setSubmitted] = useState<CsatSurveyResponseValues | null>(null);
    const [selectedRating, setSelectedRating] = useState<number | null>(null);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [hasSubmittedFeedback, setSubmittedFeedback] = useState(false);

    useEffect(() => {
        getSurveyDetails(surveyUuid())
            .then(result => {
                setDetails(result);
                setSubmitted(result.csat_survey_response);
                setSelectedRating(result.csat_survey_response?.rating ?? null);
                setFeedbackMessage(result.csat_survey_response?.feedback_message ?? '');
            })
            .catch((error: Error) => setErrorMessage(error.message || t('API.ERROR_MESSAGE')))
            .finally(() => setLoading(false));
    }, []);

    const isRatingSubmitted = isCsatRatingSubmitted(submitted);
    const isFeedbackSubmitted = isCsatFeedbackSubmitted(submitted, hasSubmittedFeedback);
    const inboxName = details?.inbox_name ?? '';
    const messageContent = details?.content || t('DESCRIPTION', { inboxName });
    const message = errorMessage || t('RATING.SUCCESS_MESSAGE');

    const submit = async (rating: number | null, feedback: string, markFeedbackSubmitted = false) => {
        if (rating === null) return;
        setUpdating(true);
        try {
            await updateSurvey(surveyUuid(), { rating, feedback_message: feedback });
            setSubmitted({ rating, feedback_message: feedback });
            if (markFeedbackSubmitted) setSubmittedFeedback(true);
        } catch (error) {
            setErrorMessage((error as Error).message || t('API.ERROR_MESSAGE'));
        } finally {
            setUpdating(false);
        }
    };

    const selectRating = (rating: number) => {
        if (isFeedbackSubmitted || isUpdating) return;
        setSelectedRating(rating);
        void submit(rating, feedbackMessage);
    };

    const sendFeedback = (feedback: string) => {
        setFeedbackMessage(feedback);
        void submit(selectedRating, feedback, true);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center flex-1 h-full min-h-screen bg-n-background">
                <Loader />
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center w-full h-full min-h-screen overflow-auto bg-n-background">
            <div className="flex flex-col w-full h-full bg-n-solid-1 rounded-lg border border-solid border-n-weak shadow-md lg:w-2/5 lg:h-auto">
                <div className="w-full px-12 pt-12 pb-6 m-auto my-0">
                    {details?.inbox_avatar_url ? (
                        <img src={details.inbox_avatar_url} alt={inboxName} className="mb-6 max-h-12" />
                    ) : null}
                    {!isRatingSubmitted ? (
                        <div
                            className="mb-8 text-lg leading-relaxed text-n-slate-12 prose prose-bubble"
                            dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(new MessageFormatter(messageContent, false).formattedMessage),
                            }}
                        />
                    ) : null}
                    {isRatingSubmitted || errorMessage ? (
                        <Banner
                            showSuccess={isRatingSubmitted}
                            showError={Boolean(errorMessage)}
                            message={message}
                        />
                    ) : null}
                    {!isRatingSubmitted ? (
                        <label className="mb-4 text-base font-medium text-n-slate-11">{t('RATING.LABEL')}</label>
                    ) : null}
                    <div className="mt-4 mb-2">
                        <CsatLevelPicker
                            rating={selectedRating}
                            label={t('RATING.LABEL')}
                            disabled={isFeedbackSubmitted || isUpdating}
                            onSelect={selectRating}
                        />
                    </div>
                    {!isFeedbackSubmitted && isRatingSubmitted ? (
                        <Feedback
                            isUpdating={isUpdating}
                            isButtonDisabled={!selectedRating || isUpdating}
                            selectedRating={selectedRating}
                            onSendFeedback={sendFeedback}
                        />
                    ) : null}
                </div>
                <div className="mb-3">
                    <Branding globalConfig={surveyGlobalConfig()} poweredByLabel={t('POWERED_BY')} />
                </div>
            </div>
        </div>
    );
}
