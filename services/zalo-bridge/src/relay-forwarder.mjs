/**
 * relay-forwarder.mjs — P12: bật 11 event zca đang bị VỨT (undo/seen/delivered/
 * reaction/typing/connected/disconnected/old_messages/old_reactions/
 * upload_attachment) → forward Laravel. 5 handler bespoke (message/error/closed/
 * group_event/friend_event) + cipher_key (B6 key material) KHÔNG đụng —
 * NO_FORWARD_EVENTS trong zca-adapter (B3 chống double-ingest).
 *
 * Lane tách (H3): inbound old_messages + undo → outbox DURABLE (đổi DB);
 * chatty (typing/seen/delivered/reaction/…) → fire-and-forget, KHÔNG outbox
 * (nghẽn FIFO chặn inbound).
 */

import { attachEventForwarder } from './zca-adapter.mjs';
import { deriveInboundSourceId } from './inbound-source-id.mjs';

// Chatty/status lane — mất cũng không mất dữ liệu nghiệp vụ; POST thẳng, lỗi bỏ qua (H3).
const FIRE_AND_FORGET_EVENTS = new Set([
    'typing', 'seen_messages', 'delivered_messages', 'reaction', 'old_reactions',
    'upload_attachment', 'connected', 'disconnected',
]);

function sanitizePlain(value) {
    try {
        return JSON.parse(JSON.stringify(value ?? null));
    } catch {
        return null;
    }
}

/**
 * Attach forwarder generic cho slot — đúng 1 lần/api instance (review MED-2:
 * relogin tái dùng listener sẽ double-fire nếu attach lại). Trả về danh sách
 * event đã subscribe (LAB: 10).
 *
 * @param {object} deps {enqueue, postFireAndForget, buildInboundPayload}
 *   buildInboundPayload = buildGroupBackfillPayload của index.mjs
 *   (slot, threadId, rawD, isSelf, threadType) → payload inbound chuẩn.
 */
export function attachRelayForwarder(slot, deps) {
    if (!slot?.api?.listener || slot.forwarderAttached) {
        return [];
    }
    slot.forwarderAttached = true;
    return attachEventForwarder(slot.api, (evt, payload) => relaySink(slot, evt, payload, deps));
}

/**
 * B5: old_messages = array N tin (shape ≠ single live) → per-item normalize +
 * source_id = msgId thật (deriveInboundSourceId) → dedup CHUNG đường live (MED-3).
 * Group dùng lại buildInboundPayload (buildGroupBackfillPayload); 1-1 cùng hàm
 * với threadType=0 (P12 mở rộng param).
 */
function normalizeOldMessage(slot, item, buildInboundPayload) {
    const rawD = item?.data;
    if (!rawD || typeof rawD !== 'object') {
        return null;
    }
    const threadId = String(item?.threadId ?? rawD?.threadId ?? '');
    if (!threadId) {
        return null;
    }
    const threadType = Number(item?.type) === 1 ? 1 : 0;
    // C-1: history trả uidFrom thật (khác live trả "0" cho self) — so uid, không tin isSelf
    const isSelf = String(rawD?.uidFrom ?? '') === String(slot.personalUid);
    return buildInboundPayload(slot, threadId, rawD, isSelf, threadType);
}

export function relaySink(slot, evt, payload, { enqueue, postFireAndForget, buildInboundPayload }) {
    if (evt === 'old_messages') {
        const items = Array.isArray(payload?.[0]) ? payload[0] : [];
        for (const item of items) {
            const inbound = normalizeOldMessage(slot, item, buildInboundPayload);
            if (inbound) {
                enqueue(inbound); // durable — type mặc định 'inbound', dedup source_id chung live
            }
        }
        return;
    }

    // H2: envelope PHẢI có connection_id — thiếu là Laravel 400 → dead-letter poison
    const envelope = {
        type: 'relay_event',
        event_type: evt,
        connection_id: slot._connectionId ?? null,
        bot_id: slot.botId ?? null,
        personal_uid: slot.personalUid ? String(slot.personalUid) : null,
        payload: sanitizePlain(payload),
    };

    if (evt === 'undo') {
        // durable — undo đổi DB (ẩn tin ma khách thu hồi); source_id để idempotent
        const first = payload?.[0];
        envelope.source_id = deriveInboundSourceId(
            'zalo_personal',
            String(slot.personalUid ?? ''),
            String(first?.threadId ?? ''),
            first?.data ?? first ?? {}
        );
        enqueue(envelope);
        return;
    }

    if (FIRE_AND_FORGET_EVENTS.has(evt)) {
        postFireAndForget(envelope); // H3: KHÔNG outbox
        return;
    }

    // Event mới của zca version sau (chưa phân lane) — durable để không mất (H1)
    enqueue(envelope);
}
