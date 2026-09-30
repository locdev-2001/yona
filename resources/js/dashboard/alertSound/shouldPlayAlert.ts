import { MESSAGE_TYPES } from 'dashboard/conversation/constants';
import type { AgentAlertPreference } from './preference';

/** Tin dồn liên tiếp chỉ kêu một lần trong khoảng này (tính chung mọi tab). */
export const MIN_ALERT_INTERVAL_MS = 3000;

/** Phần payload `message.created` cần để quyết định. */
export interface AlertableMessage {
    message_type: number;
    private?: boolean;
    conversation?: { assignee_id?: number | null };
}

export interface AlertDecisionInput {
    message: AlertableMessage;
    preference: AgentAlertPreference;
    currentUserId: number;
    /** Tab này đang hiện và đang được focus. */
    isTabActive: boolean;
    /** Lần gần nhất một tab Yona nào đó đã kêu (ms), null nếu chưa. */
    lastPlayedAt: number | null;
    now: number;
}

/**
 * Tin có đáng kêu với nhân viên này không, chưa xét tab hay giãn cách: chỉ tin khách
 * gửi tới (không phải tin mình/đồng nghiệp gửi, ghi chú nội bộ hay dòng hệ thống),
 * và nếu chọn "chỉ hội thoại của tôi" thì hội thoại phải đang giao cho mình.
 */
export function isAlertableMessage(message: AlertableMessage, preference: AgentAlertPreference, currentUserId: number): boolean {
    if (!preference.enabled) return false;
    if (message.message_type !== MESSAGE_TYPES.INCOMING || message.private) return false;
    if (preference.scope === 'assigned' && message.conversation?.assignee_id !== currentUserId) return false;

    return true;
}

export function isCoolingDown(lastPlayedAt: number | null, now: number): boolean {
    return lastPlayedAt !== null && now - lastPlayedAt < MIN_ALERT_INTERVAL_MS;
}

export function shouldPlayAlert({ message, preference, currentUserId, isTabActive, lastPlayedAt, now }: AlertDecisionInput): boolean {
    if (!isAlertableMessage(message, preference, currentUserId)) return false;
    if (preference.only_when_hidden && isTabActive) return false;

    return !isCoolingDown(lastPlayedAt, now);
}
