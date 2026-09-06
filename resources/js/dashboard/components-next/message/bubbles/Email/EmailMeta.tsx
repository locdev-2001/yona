import { t } from '../../../../../i18n';
import { MESSAGE_STATUS } from '../../constants';
import { useMessageContext } from '../../provider';

// Port từ components-next/message/bubbles/Email/EmailMeta.vue.
interface EmailAttributes {
    from?: string[];
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
}

export default function EmailMeta({ className = '' }: { className?: string }) {
    const { contentAttributes, status, sender } = useMessageContext();

    const hasError = status === MESSAGE_STATUS.FAILED;
    const email = (contentAttributes.email ?? {}) as EmailAttributes;

    const fromEmail = email.from ?? [];
    const toEmail = email.to ?? (contentAttributes.to_emails as string[] | undefined) ?? [];
    const ccEmail = (contentAttributes.cc_emails as string[] | undefined) ?? email.cc ?? [];
    const bccEmail = (contentAttributes.bcc_emails as string[] | undefined) ?? email.bcc ?? [];
    const subject = email.subject ?? '';

    // Chỉ hiện tên khi người gửi thư trùng người gửi của hội thoại.
    const senderName = (() => {
        const fromEmailAddress = fromEmail[0] ?? '';
        const senderEmail = sender?.email ?? '';
        if (!fromEmailAddress && !senderEmail) return null;
        if (fromEmailAddress === senderEmail) return sender?.name ?? null;

        return null;
    })();

    const showMeta = Boolean(
        fromEmail[0] || toEmail.length || ccEmail.length || bccEmail.length || subject,
    );

    return (
        <section
            className={`space-y-1 rtl:pl-9 ltr:pr-9 text-sm break-words ${
                hasError ? 'text-n-ruby-11' : 'text-n-slate-11'
            } ${className}`}
            style={showMeta ? undefined : { display: 'none' }}
        >
            {showMeta ? (
                <>
                    {fromEmail[0] ? (
                        <div className={hasError ? 'text-n-ruby-11' : 'text-n-slate-12'}>
                            {senderName ? (
                                <>
                                    <span>{senderName}</span>
                                    {` <${fromEmail[0]}>`}
                                </>
                            ) : (
                                fromEmail[0]
                            )}
                        </div>
                    ) : null}
                    {toEmail.length ? (
                        <div>
                            {t('EMAIL_HEADER.TO')}: {toEmail.join(', ')}
                        </div>
                    ) : null}
                    {ccEmail.length ? (
                        <div>
                            {t('EMAIL_HEADER.CC')}: {ccEmail.join(', ')}
                        </div>
                    ) : null}
                    {bccEmail.length ? (
                        <div>
                            {t('EMAIL_HEADER.BCC')}: {bccEmail.join(', ')}
                        </div>
                    ) : null}
                    {subject ? (
                        <div>
                            {t('EMAIL_HEADER.SUBJECT')}: {subject}
                        </div>
                    ) : null}
                </>
            ) : null}
        </section>
    );
}
