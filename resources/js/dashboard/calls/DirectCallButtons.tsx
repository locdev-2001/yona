import { useEffect, useRef, useState } from 'react';
import Button from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { Conversation } from 'dashboard/conversation/types';
import { t } from '../../i18n';
import { fetchDirectCallEligibility } from './api';
import { useCallSession } from './callSession';
import type { CallMediaKind } from './types';
import { useCallsEnabled } from './useCallsEnabled';
import { PHONE_TOUCH_HEIGHT, PHONE_TOUCH_SIZE } from './touchTarget';

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
// Máy tính: hai nút thoại/video. Điện thoại: một nút, bấm mở menu chọn, để tên người không bị ép
// trên mũ hẹp.
export default function DirectCallButtons({
    accountId,
    conversation,
    isCompact,
    className = '',
}: {
    accountId: number;
    conversation: Conversation;
    isCompact: boolean;
    className?: string;
}) {
    const [isMenuOpen, setMenuOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const session = useCallSession();
    const canCall = useCanCall(accountId, conversation.id, useCallsEnabled());
    const onCall = (media: CallMediaKind) => {
        if (!session.isJoining) session.startDirectCall({ accountId, conversation, media });
    };

    useEffect(() => {
        if (!isMenuOpen) return undefined;
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', closeOnOutsideClick);
        return () => document.removeEventListener('mousedown', closeOnOutsideClick);
    }, [isMenuOpen]);

    if (!canCall) return null;

    if (!isCompact) {
        return (
            <>
                <Button sm slate ghost icon="i-lucide-phone" title={t('CALLS.DIRECT.CALL_VOICE')} className={`${PHONE_TOUCH_SIZE} ${className}`} onClick={() => onCall('audio')} />
                <Button sm slate ghost icon="i-lucide-video" title={t('CALLS.DIRECT.CALL_VIDEO')} className={`${PHONE_TOUCH_SIZE} ${className}`} onClick={() => onCall('video')} />
            </>
        );
    }

    return (
        <div ref={rootRef} className="relative">
            <Button sm slate ghost icon="i-lucide-phone" title={t('CALLS.DIRECT.CALL')} className={`${PHONE_TOUCH_SIZE} ${className}`} onClick={() => setMenuOpen(open => !open)} />
            {isMenuOpen ? (
                <DropdownMenu
                    menuItems={[
                        { label: t('CALLS.DIRECT.CALL_VOICE'), value: 'audio', action: 'audio', icon: 'i-lucide-phone' },
                        { label: t('CALLS.DIRECT.CALL_VIDEO'), value: 'video', action: 'video', icon: 'i-lucide-video' },
                    ]}
                    className="top-full mt-1 end-0 w-44"
                    itemClassName={PHONE_TOUCH_HEIGHT}
                    onAction={item => {
                        setMenuOpen(false);
                        onCall(item.action as CallMediaKind);
                    }}
                />
            ) : null}
        </div>
    );
}
