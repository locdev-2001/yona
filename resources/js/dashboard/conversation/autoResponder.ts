import { useEffect, useState } from 'react';

import type { Conversation } from './types';

// AI gắn với kênh theo prop `inboxes` dùng chung (có cả AI đang tắt).
export interface InboxAiAgent {
    id: number;
    name: string;
    enabled: boolean;
}

/**
 * Trạng thái công tắc "AI tự động" của một hội thoại:
 * - `unassigned`: kênh chưa gắn nhân viên AI;
 * - `agent_off`: kênh có AI nhưng AI đang tắt trong Cài đặt;
 * - `off` / `on`: công tắc tắt / bật, AI sẵn sàng;
 * - `replying`: AI đang giữ lượt nói.
 */
export type AutoResponderStatus = 'unassigned' | 'agent_off' | 'off' | 'on' | 'replying';

export interface AutoResponderView {
    status: AutoResponderStatus;
    enabled: boolean;
    // Tên AI để hiện trên công tắc và khung soạn; null khi kênh chưa gắn AI.
    aiAgentName: string | null;
}

export function floorHeldUntilMs(conversation: Pick<Conversation, 'floor_held_until'> | null | undefined): number | null {
    const heldUntil = conversation?.floor_held_until;
    if (!heldUntil) return null;
    const time = Date.parse(heldUntil);

    return Number.isNaN(time) ? null : time;
}

export function isFloorHeld(conversation: Pick<Conversation, 'floor_held_until'> | null | undefined, nowMs: number): boolean {
    const heldUntil = floorHeldUntilMs(conversation);

    return heldUntil !== null && heldUntil > nowMs;
}

/**
 * `auto_responder.ai_agent` là sự thật realtime về AI trả lời được; prop `inboxes`
 * (nạp lúc mở trang) chỉ dùng để biết tên AI đang tắt.
 */
export function autoResponderView(
    conversation: Pick<Conversation, 'auto_responder' | 'floor_held_until'>,
    inboxAiAgent: InboxAiAgent | null | undefined,
    nowMs: number,
): AutoResponderView {
    const enabled = conversation.auto_responder?.enabled ?? false;
    const replyingAgent = conversation.auto_responder?.ai_agent ?? null;

    if (replyingAgent === null) {
        if (inboxAiAgent && !inboxAiAgent.enabled) {
            return { status: 'agent_off', enabled, aiAgentName: inboxAiAgent.name };
        }

        return { status: 'unassigned', enabled, aiAgentName: null };
    }

    if (!enabled) return { status: 'off', enabled, aiAgentName: replyingAgent.name };

    return {
        status: isFloorHeld(conversation, nowMs) ? 'replying' : 'on',
        enabled,
        aiAgentName: replyingAgent.name,
    };
}

/**
 * Đồng hồ cho khoá lượt: trả về `now` và tự render lại đúng lúc lượt hết hạn,
 * để khung soạn mở ra cả khi không nhận được sự kiện nhả lượt.
 */
export function useFloorClock(conversation: Pick<Conversation, 'floor_held_until'> | null | undefined): number {
    const [now, setNow] = useState(() => Date.now());
    const heldUntil = floorHeldUntilMs(conversation);

    useEffect(() => {
        setNow(Date.now());
        if (heldUntil === null) return undefined;
        const delay = heldUntil - Date.now();
        if (delay <= 0) return undefined;
        const timer = window.setTimeout(() => setNow(Date.now()), delay + 50);

        return () => window.clearTimeout(timer);
    }, [heldUntil]);

    return now;
}
