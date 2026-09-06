/**
 * social-events.mjs — sự kiện xã hội của Zalo (group_event / friend_event) và
 * khoá chống trùng của chúng. Tách khỏi index.mjs để test được mà KHÔNG import
 * index.mjs (import index.mjs sẽ đọc `.sessions` — phiên Zalo thật).
 */

import { createHash } from 'node:crypto';

/**
 * `FriendEventType.REQUEST` — mirror enum trong
 * `node_modules/zca-js/dist/models/FriendEvent.d.ts` (enum không export runtime
 * dạng dùng được ở module thuần, cùng tiền lệ với `ZCA_EVENTS` ở zca-adapter).
 */
export const FRIEND_EVENT_TYPE_REQUEST = 2;

/** JSON ổn định (khoá đã sắp xếp) — cùng event thì cùng chuỗi, để hash chống trùng. */
export function stableJsonForDedup(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
        return `[${value.map(stableJsonForDedup).join(',')}]`;
    }
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => JSON.stringify(k) + ':' + stableJsonForDedup(value[k])).join(',')}}`;
}

/**
 * P06: khoá theo accountUid (ổn định qua reconnect) — KHÔNG connectionId (đổi mỗi
 * lần reconnect, sẽ tách cùng 1 event thành 2 source_id khác nhau).
 */
export function zaloPersonalSocialSourceId(accountUid, socialKind, act, threadId, eventPayload) {
    const h = createHash('sha256')
        .update(String(accountUid))
        .update('\n')
        .update(String(socialKind))
        .update('\n')
        .update(String(act ?? ''))
        .update('\n')
        .update(String(threadId ?? ''))
        .update('\n')
        .update(stableJsonForDedup(eventPayload))
        .digest('hex')
        .slice(0, 48);
    return `zps:${accountUid}:${h}`;
}

/**
 * Q7 — lời mời kết bạn ĐẾN. `initializeFriendEvent` đặt `threadId = data.toUid`
 * (là mình) và `isSelf = data.fromUid == uid`, nên người mời nằm ở `fromUid` và
 * lời mời do MÌNH gửi đi có `isSelf === true` (bỏ qua, không phải việc của inbox).
 *
 * @returns {{uid: string, message?: string} | null}
 */
export function friendRequestFromEvent(event) {
    if (!event || typeof event !== 'object') {
        return null;
    }
    if (Number(event.type) !== FRIEND_EVENT_TYPE_REQUEST || event.isSelf === true) {
        return null;
    }
    const data = event.data;
    if (!data || typeof data !== 'object') {
        return null;
    }
    const uid = String(data.fromUid ?? '').trim();
    if (!uid || uid === '0') {
        return null;
    }
    const message = String(data.message ?? '').trim();
    return { uid, ...(message ? { message } : {}) };
}

/**
 * Payload webhook `friend_request`. `source_id` chỉ phụ thuộc (uid tài khoản,
 * người mời, lời nhắn) nên Zalo bắn lại cùng lời mời sau reconnect vẫn ra một
 * khoá — driver dedupe được như tin nhắn.
 */
export function buildFriendRequestPayload({ connectionId, botId, personalUid, request, profile = null }) {
    const payload = {
        type: 'friend_request',
        connection_id: connectionId,
        bot_id: botId,
        personal_uid: String(personalUid),
        user: {
            uid: request.uid,
            name: profile?.name ? String(profile.name) : request.uid,
            avatar: profile?.avatar ? String(profile.avatar) : null,
        },
        source_id: zaloPersonalSocialSourceId(personalUid, 'friend_request', '', request.uid, request),
    };
    if (request.message) {
        payload.message = request.message;
    }
    return payload;
}
