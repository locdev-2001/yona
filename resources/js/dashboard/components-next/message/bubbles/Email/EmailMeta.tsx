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

    if (!showMeta) return null;

    const mutedClass = hasError ? 'text-n-ruby-11' : 'text-n-slate-11';
    const strongClass = hasError ? 'text-n-ruby-11' : 'text-n-slate-12';
    const recipientLines = [
        { label: t('EMAIL_HEADER.TO'), addresses: toEmail },
        { label: t('EMAIL_HEADER.CC'), addresses: ccEmail },
        { label: t('EMAIL_HEADER.BCC'), addresses: bccEmail },
    ].filter(line => line.addresses.length > 0);

    return (
        <header data-testid="email-meta" className={`min-w-0 space-y-0.5 break-words ${className}`}>
            {subject ? (
                <div data-testid="email-subject" className={`text-sm font-semibold leading-snug ${strongClass}`}>
                    {subject}
                </div>
            ) : null}
            {fromEmail[0] ? (
                <div className="text-sm leading-snug">
                    {senderName ? (
                        <>
                            <span className={`font-medium ${strongClass}`}>{senderName}</span>{' '}
                            <span className={`text-xs ${mutedClass}`}>&lt;{fromEmail[0]}&gt;</span>
                        </>
                    ) : (
                        <span className={`font-medium ${strongClass}`}>{fromEmail[0]}</span>
                    )}
                </div>
            ) : null}
            {recipientLines.map(line => (
                <div key={line.label} className={`text-xs ${mutedClass}`}>
                    {line.label}: {line.addresses.join(', ')}
                </div>
            ))}
        </header>
    );
}
