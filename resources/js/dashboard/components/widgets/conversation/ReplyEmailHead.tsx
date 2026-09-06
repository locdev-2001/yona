import { useState } from 'react';

import { t } from '../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import WootInput from 'dashboard/components/widgets/forms/Input';
import { validEmailsByComma } from './helpers/emailHeadHelper';
import './ReplyEmailHead.scss';

// Port từ components/widgets/conversation/ReplyEmailHead.vue. Bản gốc giữ bản
// sao nội bộ và chỉ emit lúc blur — ở đây state do ReplyBox làm chủ, blur mới
// đánh dấu "đã chạm" để hiện lỗi (cùng hành vi hiển thị).
const FIELD_CLASS =
    '[&>input]:!mb-0 [&>input]:border-transparent [&>input]:!outline-none [&>input]:h-8 [&>input]:!text-sm [&>input]:!border-0 [&>input]:border-none [&>input]:!bg-transparent dark:[&>input]:!bg-transparent';

interface ReplyEmailHeadProps {
    toEmails: string;
    ccEmails: string;
    bccEmails: string;
    onChange: (value: { toEmails?: string; ccEmails?: string; bccEmails?: string }) => void;
}

export default function ReplyEmailHead({ toEmails, ccEmails, bccEmails, onChange }: ReplyEmailHeadProps) {
    const [showBcc, setShowBcc] = useState(false);
    const [touched, setTouched] = useState(false);

    const toError = touched && !validEmailsByComma(toEmails);
    const ccError = touched && !validEmailsByComma(ccEmails);
    const bccError = touched && !validEmailsByComma(bccEmails);

    return (
        <div className="reply-email-head">
            {toEmails ? (
                <div>
                    <div className={`input-group small ${toError ? 'error' : ''}`}>
                        <label className="input-group-label">
                            {t('CONVERSATION.REPLYBOX.EMAIL_HEAD.TO')}
                        </label>
                        <div className="flex-1 min-w-0 m-0 rounded-none whitespace-nowrap">
                            <WootInput
                                value={toEmails}
                                type="text"
                                className={`${FIELD_CLASS} ${toError ? 'error' : ''}`}
                                placeholder={t('CONVERSATION.REPLYBOX.EMAIL_HEAD.CC.PLACEHOLDER')}
                                onChange={value => onChange({ toEmails: value })}
                                onBlur={() => setTouched(true)}
                            />
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="input-group-wrap">
                <div className={`input-group small ${ccError ? 'error' : ''}`}>
                    <label className="input-group-label">
                        {t('CONVERSATION.REPLYBOX.EMAIL_HEAD.CC.LABEL')}
                    </label>
                    <div className="flex-1 min-w-0 m-0 rounded-none whitespace-nowrap">
                        <WootInput
                            value={ccEmails}
                            type="text"
                            className={`${FIELD_CLASS} ${ccError ? 'error' : ''}`}
                            placeholder={t('CONVERSATION.REPLYBOX.EMAIL_HEAD.CC.PLACEHOLDER')}
                            onChange={value => onChange({ ccEmails: value })}
                            onBlur={() => setTouched(true)}
                        />
                    </div>
                    {!showBcc ? (
                        <Button
                            label={t('CONVERSATION.REPLYBOX.EMAIL_HEAD.ADD_BCC')}
                            ghost
                            xs
                            blue
                            onClick={() => setShowBcc(true)}
                        />
                    ) : null}
                </div>
                {ccError ? (
                    <span className="message">{t('CONVERSATION.REPLYBOX.EMAIL_HEAD.CC.ERROR')}</span>
                ) : null}
            </div>

            {showBcc ? (
                <div className="input-group-wrap">
                    <div className={`input-group small ${bccError ? 'error' : ''}`}>
                        <label className="input-group-label">
                            {t('CONVERSATION.REPLYBOX.EMAIL_HEAD.BCC.LABEL')}
                        </label>
                        <div className="flex-1 min-w-0 m-0 rounded-none whitespace-nowrap">
                            <WootInput
                                value={bccEmails}
                                type="text"
                                className={`${FIELD_CLASS} ${bccError ? 'error' : ''}`}
                                placeholder={t('CONVERSATION.REPLYBOX.EMAIL_HEAD.BCC.PLACEHOLDER')}
                                onChange={value => onChange({ bccEmails: value })}
                                onBlur={() => setTouched(true)}
                            />
                        </div>
                    </div>
                    {bccError ? (
                        <span className="message">{t('CONVERSATION.REPLYBOX.EMAIL_HEAD.BCC.ERROR')}</span>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
