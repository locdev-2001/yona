import { useState } from 'react';

import NextButton from 'dashboard/components-next/button/Button';
import { useAlert } from 'dashboard/composables/useAlert';
import { updateContact } from 'dashboard/contacts/api';
import { t } from '../../../i18n';
import { STATUS_TYPE } from '../constants';
import { useConversation } from '../ConversationContext';

type RequestAction = 'accept' | 'ignore' | 'block' | 'unblock';

// Thay khung trả lời khi hội thoại đang chờ người nhận chấp nhận. Chặn là chặn liên hệ:
// hội thoại vẫn nằm ở tab Đang chờ, tin mới của người đó không tới nữa.
export default function MessageRequestCard() {
    const { accountId, selectedConversation, toggleStatus, declineConversation } = useConversation();
    const [runningAction, setRunningAction] = useState<RequestAction | null>(null);
    const [blockedOverride, setBlockedOverride] = useState<{ contactId: number; blocked: boolean } | null>(null);

    const sender = selectedConversation?.meta.sender;
    if (!selectedConversation || !sender) return null;

    const isBlocked = blockedOverride?.contactId === sender.id ? blockedOverride.blocked : Boolean(sender.blocked);

    const run = async (action: RequestAction, perform: () => Promise<unknown>, successKey: string) => {
        setRunningAction(action);
        try {
            await perform();
            useAlert(t(successKey));
        } catch {
            useAlert(t('CHAT.REQUEST.FAILED'));
        } finally {
            setRunningAction(null);
        }
    };

    const setBlocked = (blocked: boolean) =>
        updateContact(accountId, sender.id, { blocked }).then(() => setBlockedOverride({ contactId: sender.id, blocked }));

    const actionButton = (action: RequestAction, label: string, onClick: () => void, tone: 'blue' | 'slate' | 'ruby') => (
        <NextButton
            sm
            solid={tone === 'blue'}
            faded={tone !== 'blue'}
            blue={tone === 'blue'}
            slate={tone === 'slate'}
            ruby={tone === 'ruby'}
            className="max-md:!h-11"
            label={label}
            isLoading={runningAction === action}
            disabled={runningAction !== null}
            onClick={onClick}
        />
    );

    const ignoreButton = actionButton(
        'ignore',
        t('CHAT.REQUEST.IGNORE'),
        () => run('ignore', declineConversation, 'CHAT.REQUEST.IGNORED'),
        'slate',
    );

    return (
        <section className="mx-3 mb-3 md:mx-4 md:mb-4 p-4 rounded-xl bg-n-solid-2 outline outline-1 outline-n-weak">
            {isBlocked ? (
                <>
                    <p className="m-0 text-sm text-n-slate-11">{t('CHAT.REQUEST.BLOCKED_BODY')}</p>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                        {actionButton('unblock', t('CHAT.ACTIONS.UNBLOCK'), () => run('unblock', () => setBlocked(false), 'CHAT.BLOCK.UNBLOCKED'), 'blue')}
                        {ignoreButton}
                    </div>
                </>
            ) : (
                <>
                    <p className="m-0 text-sm font-medium text-n-slate-12 break-words">{t('CHAT.REQUEST.TITLE', { name: sender.name ?? '' })}</p>
                    <p className="mt-1 mb-0 text-sm text-n-slate-11">{t('CHAT.REQUEST.BODY')}</p>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                        {actionButton(
                            'accept',
                            t('CHAT.REQUEST.ACCEPT'),
                            () => run('accept', () => toggleStatus({ status: STATUS_TYPE.OPEN }), 'CHAT.REQUEST.ACCEPTED'),
                            'blue',
                        )}
                        {ignoreButton}
                        {actionButton('block', t('CHAT.REQUEST.BLOCK'), () => run('block', () => setBlocked(true), 'CHAT.BLOCK.BLOCKED'), 'ruby')}
                    </div>
                </>
            )}
        </section>
    );
}
