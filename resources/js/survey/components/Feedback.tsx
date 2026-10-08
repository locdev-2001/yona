import { useState } from 'react';

import Loader from 'shared/components/loader/Loader';

import { t } from '../i18n';

// Port từ survey/components/Feedback.vue + shared/components/{Button,TextArea}.vue
// (hai component đó chỉ trang này dùng nên dựng thẳng vào đây thay vì tạo hai
// lớp bọc rỗng).
interface FeedbackProps {
    isUpdating?: boolean;
    isButtonDisabled?: boolean;
    selectedRating?: number | null;
    onSendFeedback: (feedback: string) => void;
}

export default function Feedback({
    isUpdating = false,
    isButtonDisabled = false,
    selectedRating = null,
    onSendFeedback,
}: FeedbackProps) {
    const [feedback, setFeedback] = useState('');
    const isSubmitDisabled = isButtonDisabled || !selectedRating || !feedback.trim();

    return (
        <div className="mt-6">
            <label className="text-base font-medium text-n-slate-12">{t('FEEDBACK.LABEL')}</label>
            <label className="block my-5">
                <textarea
                    value={feedback}
                    className="w-full px-3 py-2 leading-tight border rounded outline-none resize-none text-n-gray-12 border-n-weak hover:border-n-weak focus:border-n-weak min-h-32"
                    placeholder={t('FEEDBACK.PLACEHOLDER')}
                    onChange={event => setFeedback(event.target.value)}
                />
            </label>
            <div className="flex items-center float-right font-medium">
                <button
                    className="text-white py-3 px-4 rounded-lg shadow-sm leading-4 cursor-pointer disabled:opacity-50 bg-n-brand hover:brightness-110"
                    disabled={isSubmitDisabled}
                    onClick={() => {
                        if (!isSubmitDisabled) onSendFeedback(feedback);
                    }}
                >
                    {isUpdating ? <Loader size={16} /> : null}
                    {t('FEEDBACK.BUTTON_TEXT')}
                </button>
            </div>
        </div>
    );
}
