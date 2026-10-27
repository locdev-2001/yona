import { useState } from 'react';
import type { FormEvent } from 'react';

import Button from 'dashboard/components-next/button/Button';
import Modal from 'dashboard/components/Modal';
import ModalHeader from 'dashboard/components/ModalHeader';
import { useAlert } from 'dashboard/composables/useAlert';
import { sendEmailTranscript } from 'dashboard/conversation/api';
import type { Conversation } from 'dashboard/conversation/types';
import { ApiError } from 'dashboard/helper/apiClient';
import { t } from '../../i18n';
import { isProductFeatureVisible } from 'shared/helpers/productVisibility';

// Port từ widgets/conversation/EmailTranscriptModal.vue. Validate email như vuelidate
// (required + email + minLength 4), lỗi hiện sau khi gõ ($touch). Khác biệt cố ý B5:
// POST …/transcript chưa có backend (mailer D5) → Submit bấm được, backend 404 → toast SEND_EMAIL_ERROR.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type TranscriptRecipientType = '' | 'contact' | 'assignee' | 'other_email_address';

interface EmailTranscriptModalProps {
    show: boolean;
    currentChat: Conversation;
    accountId: number;
    onCancel: () => void;
}

export default function EmailTranscriptModal({ show, currentChat, accountId, onCancel }: EmailTranscriptModalProps) {
    const [email, setEmail] = useState('');
    const [emailTouched, setEmailTouched] = useState(false);
    const [selectedType, setSelectedType] = useState<TranscriptRecipientType>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sentToOtherEmailAddress = selectedType === 'other_email_address';
    const emailError = emailTouched && !(email.length >= 4 && EMAIL_PATTERN.test(email));
    const isFormValid = selectedType ? (sentToOtherEmailAddress ? Boolean(email) && !emailError : true) : false;

    const selectedEmailAddress = (): string => {
        const { meta } = currentChat;
        switch (selectedType) {
            case 'contact':
                return meta.sender.email ?? '';
            case 'assignee':
                return meta.assignee?.email ?? '';
            case 'other_email_address':
                return email;
            default:
                return '';
        }
    };

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            await sendEmailTranscript(accountId, currentChat.id, selectedEmailAddress());
            useAlert(t('EMAIL_TRANSCRIPT.SEND_EMAIL_SUCCESS'));
            onCancel();
        } catch (error) {
            const status = error instanceof ApiError ? error.status : undefined;
            useAlert(
                status === 402 ? t('EMAIL_TRANSCRIPT.SEND_EMAIL_PAYMENT_REQUIRED') : t('EMAIL_TRANSCRIPT.SEND_EMAIL_ERROR'),
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const showAssigneeOption =
        isProductFeatureVisible('conversationAssignment') &&
        Boolean(currentChat.meta.assignee) &&
        currentChat.meta.assignee_type !== 'AgentBot';

    return (
        <Modal show={show} onClose={onCancel}>
            <div className="flex flex-col h-auto overflow-auto">
                <ModalHeader headerTitle={t('EMAIL_TRANSCRIPT.TITLE')} headerContent={t('EMAIL_TRANSCRIPT.DESC')} />
                <form className="w-full" onSubmit={onSubmit}>
                    <div className="w-full">
                        {currentChat.meta.sender?.email ? (
                            <div className="flex items-center gap-2">
                                <input
                                    id="contact"
                                    type="radio"
                                    name="selectedType"
                                    value="contact"
                                    checked={selectedType === 'contact'}
                                    onChange={() => setSelectedType('contact')}
                                />
                                <label htmlFor="contact">{t('EMAIL_TRANSCRIPT.FORM.SEND_TO_CONTACT')}</label>
                            </div>
                        ) : null}
                        {showAssigneeOption ? (
                            <div className="flex items-center gap-2">
                                <input
                                    id="assignee"
                                    type="radio"
                                    name="selectedType"
                                    value="assignee"
                                    checked={selectedType === 'assignee'}
                                    onChange={() => setSelectedType('assignee')}
                                />
                                <label htmlFor="assignee">{t('EMAIL_TRANSCRIPT.FORM.SEND_TO_AGENT')}</label>
                            </div>
                        ) : null}
                        <div className="flex items-center gap-2">
                            <input
                                id="other_email_address"
                                type="radio"
                                name="selectedType"
                                value="other_email_address"
                                checked={sentToOtherEmailAddress}
                                onChange={() => setSelectedType('other_email_address')}
                            />
                            <label htmlFor="other_email_address">
                                {t('EMAIL_TRANSCRIPT.FORM.SEND_TO_OTHER_EMAIL_ADDRESS')}
                            </label>
                        </div>
                        {sentToOtherEmailAddress ? (
                            <div className="w-[50%] mt-1">
                                <label className={emailError ? 'error' : ''}>
                                    <input
                                        type="text"
                                        value={email}
                                        placeholder={t('EMAIL_TRANSCRIPT.FORM.EMAIL.PLACEHOLDER')}
                                        onChange={event => {
                                            setEmail(event.target.value);
                                            setEmailTouched(true);
                                        }}
                                    />
                                    {emailError ? (
                                        <span className="message">{t('EMAIL_TRANSCRIPT.FORM.EMAIL.ERROR')}</span>
                                    ) : null}
                                </label>
                            </div>
                        ) : null}
                    </div>
                    <div className="flex flex-row justify-end w-full gap-2 px-0 py-2">
                        <Button faded slate type="reset" label={t('EMAIL_TRANSCRIPT.CANCEL')} onClick={onCancel} />
                        <Button
                            type="submit"
                            label={t('EMAIL_TRANSCRIPT.SUBMIT')}
                            disabled={!isFormValid}
                            isLoading={isSubmitting}
                        />
                    </div>
                </form>
            </div>
        </Modal>
    );
}
