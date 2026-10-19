import { t } from '../../../../i18n';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Code from 'dashboard/components/Code';
import type { Inbox } from '../types';

// Port từ settings/inbox/channels/emailChannels/EmailInboxFinish.vue.
interface EmailInboxFinishProps {
    inbox: Inbox;
    inboxId: number;
    accountId: number;
}

export default function EmailInboxFinish({ inbox, inboxId, accountId }: EmailInboxFinishProps) {
    const showForwardingAddress = Boolean(inbox.forwarding_enabled);
    const message = showForwardingAddress
        ? t('INBOX_MGMT.ADD.EMAIL_CHANNEL.FINISH_MESSAGE')
        : t('INBOX_MGMT.ADD.EMAIL_CHANNEL.FINISH_MESSAGE_NO_FORWARDING');

    return (
        <div className="w-full text-center">
            <p className="text-base text-n-slate-11 mt-4 w-4/5 mx-auto leading-7">{message}</p>

            {showForwardingAddress ? (
                <div className="w-[50%] max-w-[50%] mx-auto">
                    <p className="mt-8 mb-4 font-medium text-n-slate-11">
                        {t('INBOX_MGMT.ADD.EMAIL_CHANNEL.FORWARDING_ADDRESS_LABEL')}
                    </p>
                    <Code lang="html" script={inbox.forward_to_email ?? ''} />
                </div>
            ) : null}

            <p className="mt-8 text-sm text-n-slate-11 pb-4">
                <a
                    href={accountScopedUrl(accountId, `settings/inboxes/${inboxId}/configuration`)}
                    className="text-n-woot-600 hover:text-n-woot-700 underline"
                >
                    {t('INBOX_MGMT.ADD.EMAIL_CHANNEL.CONFIGURE_SMTP_IMAP_LINK')}
                </a>{' '}
                {t('INBOX_MGMT.ADD.EMAIL_CHANNEL.CONFIGURE_SMTP_IMAP_TEXT')}
            </p>
        </div>
    );
}
