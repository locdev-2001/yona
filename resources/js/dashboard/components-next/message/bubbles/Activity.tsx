import { useState } from 'react';
import { messageTimestamp } from 'shared/helpers/timeHelper';

import { t } from '../../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import BaseBubble from './Base';
import { useMessageContext } from '../provider';
import { useOptionalConversation } from '../../../conversation/ConversationContext';
import { MESSAGE_TYPES } from '../constants';
import type { ConversationMessage } from '../../../conversation/types';

// Port từ dashboard/components-next/message/bubbles/Activity.vue —
// v-tooltip.top → attr title trên bubble.

const AUTO_RESPONDER_ACTIVITY = 'auto_responder_changed';

function autoResponderActivity(contentAttributes: Record<string, unknown>): { ai_auto_reply: boolean } | null {
    const activity = contentAttributes.activity as { type?: unknown; ai_auto_reply?: unknown } | undefined;

    return activity?.type === AUTO_RESPONDER_ACTIVITY ? { ai_auto_reply: Boolean(activity.ai_auto_reply) } : null;
}

// Dòng "tắt AI tự động" mới nhất của hội thoại mới mang liên kết "Bật lại AI".
export function latestAutoResponderActivityId(messages: ConversationMessage[]): number | null {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message.message_type === MESSAGE_TYPES.ACTIVITY && autoResponderActivity(message.content_attributes ?? {})) {
            return message.id;
        }
    }

    return null;
}

function ResumeAutoResponderLink() {
    const conversation = useOptionalConversation();
    const [isResuming, setResuming] = useState(false);
    if (!conversation) return null;

    return (
        <>
            <span aria-hidden="true">·</span>
            <button
                type="button"
                className="text-n-blue-11 hover:text-n-blue-12 hover:underline disabled:opacity-60"
                disabled={isResuming}
                onClick={() => {
                    setResuming(true);
                    conversation
                        .setAutoResponder(true)
                        .catch((error: unknown) => useAlert(parseApiErrorMessage(error) || t('CONVERSATION.AUTO_RESPONDER.TOGGLE_ERROR')))
                        .finally(() => setResuming(false));
                }}
            >
                {t('CONVERSATION.AUTO_RESPONDER.RESUME')}
            </button>
        </>
    );
}

export default function ActivityBubble() {
    const { id, content, createdAt, contentAttributes } = useMessageContext();
    const conversation = useOptionalConversation();

    const readableTime = messageTimestamp(createdAt, 'LLL d, h:mm a');
    const activity = autoResponderActivity(contentAttributes);
    const selected = conversation?.selectedConversation ?? null;
    const canResume =
        activity !== null &&
        !activity.ai_auto_reply &&
        selected !== null &&
        !selected.auto_responder?.enabled &&
        Boolean(selected.auto_responder?.ai_agent) &&
        latestAutoResponderActivityId(conversation?.messages ?? []) === id;

    return (
        <BaseBubble
            className="px-3 py-1 !rounded-xl flex min-w-0 items-center gap-2"
            title={readableTime}
            dataBubbleName="activity"
        >
            <span title={content ?? ''}>{content}</span>
            {canResume ? <ResumeAutoResponderLink /> : null}
        </BaseBubble>
    );
}
