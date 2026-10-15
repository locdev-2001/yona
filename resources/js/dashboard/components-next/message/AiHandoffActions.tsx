import { useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import { useAlert } from 'dashboard/composables/useAlert';
import { useOptionalConversation } from '../../conversation/ConversationContext';
import type { SharedPageProps } from '../../../types';

// `content_attributes.ai_handoff` do nhân viên AI ghi khi chuyển hội thoại cho người.
export interface AiHandoff {
    reason: string;
    question: string | null;
}

export const AI_HANDOFF_REASONS = ['binding_info_missing', 'customer_requested_human', 'complaint', 'out_of_scope', 'other'] as const;

export function readAiHandoff(contentAttributes: Record<string, unknown>): AiHandoff | null {
    const raw = contentAttributes.ai_handoff;
    if (!raw || typeof raw !== 'object') return null;
    const { reason, question } = raw as { reason?: unknown; question?: unknown };

    return {
        reason: typeof reason === 'string' ? reason : 'other',
        question: typeof question === 'string' && question.trim() !== '' ? question : null,
    };
}

export function aiHandoffReasonLabel(reason: string): string {
    const key = (AI_HANDOFF_REASONS as readonly string[]).includes(reason) ? reason : 'other';

    return t(`CONVERSATION.AUTO_RESPONDER.HANDOFF.REASONS.${key}`);
}

interface AiHandoffActionsProps {
    handoff: AiHandoff;
    // Mở form tạo câu trả lời mẫu, điền sẵn nội dung.
    onCreateCannedResponse?: (content: string) => void;
}

// Hai việc nhân viên làm ngay trên ghi chú AI chuyển cho người: nhận hội thoại về mình,
// và thêm câu trả lời mẫu cho câu AI chưa trả lời được (lần sau AI tự trả lời).
export default function AiHandoffActions({ handoff, onCreateCannedResponse }: AiHandoffActionsProps) {
    const conversation = useOptionalConversation();
    const currentUser = usePage<SharedPageProps>().props.auth?.user ?? null;
    const [isTakingOver, setTakingOver] = useState(false);
    const assignee = conversation?.selectedConversation?.meta?.assignee ?? null;
    const isMine = assignee !== null && currentUser !== null && assignee.id === currentUser.id;

    const takeOver = async () => {
        if (!conversation || !currentUser) return;
        setTakingOver(true);
        try {
            await conversation.assignAgent({ id: currentUser.id, name: currentUser.name ?? '' });
            useAlert(t('CONVERSATION.AUTO_RESPONDER.HANDOFF.TAKEN_OVER'));
        } catch {
            useAlert(t('CONVERSATION.AUTO_RESPONDER.HANDOFF.TAKE_OVER_ERROR'));
        } finally {
            setTakingOver(false);
        }
    };

    return (
        <div className="mt-1.5 flex flex-wrap items-center gap-2" data-testid="ai-handoff-actions">
            <span className="text-xs text-n-slate-11">{aiHandoffReasonLabel(handoff.reason)}</span>
            {conversation && currentUser ? (
                <Button
                    sm
                    type="button"
                    label={isMine ? t('CONVERSATION.AUTO_RESPONDER.HANDOFF.TAKEN') : t('CONVERSATION.AUTO_RESPONDER.HANDOFF.TAKE_OVER')}
                    disabled={isMine || isTakingOver}
                    isLoading={isTakingOver}
                    onClick={() => void takeOver()}
                />
            ) : null}
            {handoff.question && onCreateCannedResponse ? (
                <Button
                    sm
                    faded
                    slate
                    type="button"
                    label={t('CONVERSATION.AUTO_RESPONDER.HANDOFF.ADD_CANNED')}
                    onClick={() => onCreateCannedResponse(handoff.question ?? '')}
                />
            ) : null}
        </div>
    );
}
