import { useEffect, useState } from 'react';
import Button from 'dashboard/components-next/button/Button';
import type { Conversation } from 'dashboard/conversation/types';
import { t } from '../../i18n';
import { fetchDirectCallEligibility } from './api';
import { useCallSession } from './callSession';
import type { CallMediaKind } from './types';
import { useCallsEnabled } from './useCallsEnabled';

// Hội thoại 1-1 trên Yona đã hỏi máy chủ (gọi được hay không), nhớ trong phiên trang.
const eligibilityByConversation = new Map<string, boolean>();

function useCanCall(accountId: number, conversationId: number, isEnabled: boolean): boolean {
    const key = `${accountId}:${conversationId}`;
    const [canCall, setCanCall] = useState(() => eligibilityByConversation.get(key) ?? false);

    useEffect(() => {
        if (!isEnabled) return undefined;
        let isCurrent = true;
        setCanCall(eligibilityByConversation.get(key) ?? false);
        fetchDirectCallEligibility(accountId, conversationId)
            .then(({ callable }) => {
                eligibilityByConversation.set(key, callable);
                if (isCurrent) setCanCall(callable);
            })
            .catch(() => undefined);
        return () => {
            isCurrent = false;
        };
    }, [accountId, conversationId, isEnabled, key]);

    return isEnabled && canCall;
}

// Nút gọi ở mũ khung chat 1-1 trên Yona, chỉ hiện khi hai người là bạn bè (máy chủ trả lời).
// Mọi bề rộng đều có đủ hai nút thoại và video, gọi bằng một chạm như Zalo/Messenger.
export default function DirectCallButtons({
    accountId,
    conversation,
    className = '',
}: {
    accountId: number;
    conversation: Conversation;
    className?: string;
}) {
    const session = useCallSession();
    const canCall = useCanCall(accountId, conversation.id, useCallsEnabled());
    const onCall = (media: CallMediaKind) => {
        if (!session.isJoining) session.startDirectCall({ accountId, conversation, media });
    };

    if (!canCall) return null;

    return (
        <>
            <Button sm slate ghost icon="i-lucide-phone" title={t('CALLS.DIRECT.CALL_VOICE')} className={className} onClick={() => onCall('audio')} />
            <Button sm slate ghost icon="i-lucide-video" title={t('CALLS.DIRECT.CALL_VIDEO')} className={className} onClick={() => onCall('video')} />
        </>
    );
}
