import { useState } from 'react';

import NextButton from 'dashboard/components-next/button/Button';
import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';

// Tin từ người lạ: chỗ ô soạn là lời mời. Chấp nhận thì thành cuộc trò chuyện bình
// thường; Xoá thì biến khỏi danh sách (người kia không được báo); Chặn thì người kia
// không nhắn được nữa. Trả lời cũng là chấp nhận, nên ô soạn mở sau khi chấp nhận.
export default function MessageRequestBanner() {
    const { selectedConversation, acceptRequest, removeConversation, setCounterpartBlocked, conversationId } = useConversation();
    const [pendingAction, setPendingAction] = useState<'accept' | 'delete' | 'block' | null>(null);
    const name = selectedConversation?.meta.sender.name ?? '';

    const run = async (action: 'accept' | 'delete' | 'block') => {
        setPendingAction(action);
        try {
            if (action === 'accept') await acceptRequest();
            if (action === 'delete') await removeConversation(conversationId);
            if (action === 'block') {
                await setCounterpartBlocked(true);
                await removeConversation(conversationId);
            }
        } finally {
            setPendingAction(null);
        }
    };

    return (
        <div className="flex flex-col items-center gap-3 px-4 py-4 border-t border-n-weak bg-n-surface-panel text-center">
            <div>
                <p className="m-0 text-sm font-medium text-n-slate-12">{t('CHAT.REQUEST.TITLE', { name })}</p>
                <p className="m-0 mt-1 text-sm text-n-slate-11">{t('CHAT.REQUEST.BODY')}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 w-full">
                <NextButton
                    ruby
                    faded
                    className="min-h-11 flex-1 max-w-40"
                    label={t('CHAT.REQUEST.BLOCK')}
                    isLoading={pendingAction === 'block'}
                    onClick={() => void run('block')}
                />
                <NextButton
                    slate
                    faded
                    className="min-h-11 flex-1 max-w-40"
                    label={t('CHAT.REQUEST.DELETE')}
                    isLoading={pendingAction === 'delete'}
                    onClick={() => void run('delete')}
                />
                <NextButton
                    className="min-h-11 flex-1 max-w-40"
                    label={t('CHAT.REQUEST.ACCEPT')}
                    isLoading={pendingAction === 'accept'}
                    onClick={() => void run('accept')}
                />
            </div>
        </div>
    );
}
