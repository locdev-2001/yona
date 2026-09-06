/**
 * Tier 2 — Backfill khi reconnect Zalo. Hai đường:
 *
 * 1. requestThreadBackfill (WS cmd 510/511) — đường CHÍNH từ 05/07/2026, phủ cả
 *    1-1 lẫn nhóm. ĐÃ WIRE tự động: hook listener 'cipher_key' trong index.mjs
 *    (mọi lần WS auth xong) + manual POST /backfill/threads (ui-actions.mjs).
 * 2. backfillOnReconnect (REST getUnreadMark + getGroupChatHistory) — CHẾT từ
 *    07/2026: Zalo trả 404 cho /api/group/history (đo thật session mới 05/07,
 *    zca-js 2.1.2 là bản mới nhất). Giữ lại vì fail êm + tự sống lại nếu Zalo
 *    mở endpoint; xóa khi xác nhận chết hẳn.
 *
 * Giới hạn biết trước:
 * - WS old_messages: cửa sổ tin GẦN NHẤT (spike 1b đo 48 tin/lần; runtime 05/07
 *   thấy 2 tin/lần lane user, 0 lane group) — gap dài vượt cửa sổ cần gap marker (P05).
 * - Reconnect KHÔNG auto-push tin 1-1 (passive) — phải chủ động requestOldMessages.
 * - PHẢI chờ ~5s sau cipher_key mới request — gửi ngay server im lặng/đóng WS
 *   NOT_AUTHENTICATED (đo thật 05/07; spike 1b cũng chờ 6s).
 */

import { ThreadType } from 'zca-js';
import { deriveInboundSourceId } from './inbound-source-id.mjs';

/**
 * P08 — kéo gap qua WS cmd 510/511 (listener.requestOldMessages): ~48 tin gần
 * nhất mỗi lane (user + group), response về ASYNC qua event 'old_messages' →
 * relay-forwarder normalize + dedup source_id chung đường live.
 *
 * Đây là đường sync CHÍNH từ 07/2026: REST getGroupChatHistory bị Zalo trả 404
 * (endpoint /api/group/history chết upstream, zca-js 2.1.2 là bản mới nhất).
 *
 * PHẢI gọi khi WS đã mở (hook listener 'connected') — sendWs no-op im lặng nếu
 * ws chưa connect, KHÔNG throw.
 *
 * @returns {string[]} lanes đã request thành công ('user'/'group')
 */
export function requestThreadBackfill(slot, lastMsgId = null) {
    const listener = slot?.api?.listener;
    if (typeof listener?.requestOldMessages !== 'function') {
        return [];
    }
    const requested = [];
    for (const [lane, threadType] of [['user', ThreadType.User], ['group', ThreadType.Group]]) {
        try {
            listener.requestOldMessages(threadType, lastMsgId);
            requested.push(lane);
        } catch (e) {
            console.warn('backfill: requestOldMessages fail', lane, e?.message || e);
        }
    }
    return requested;
}

const DEEP_BATCH_WAIT_MS = 10000;
const DEEP_ROUND_DELAY_MS = 1000;
const DEEP_MAX_ROUNDS = 40;

/**
 * Kéo lịch sử sâu bằng cursor: request → chờ batch old_messages → lấy msgId
 * CŨ NHẤT làm lastMsgId → lặp, cho tới khi chạm cutoff (days) / batch rỗng /
 * toàn tin đã thấy / hết vòng. Tin tự enqueue → webhook qua relaySink (dedup
 * source_id) — hàm này CHỈ điều khiển pagination, không đụng dữ liệu.
 *
 * Lane chạy TUẦN TỰ (user rồi group) — slot.onOldMessagesBatch là single
 * consumer do relaySink gọi (relay-forwarder.mjs).
 *
 * ponytail: gap-fill tự động (cipher_key) bắn xen kẽ chỉ làm loop nhận batch
 * window đầu lần nữa — dedup lo, không cần correlate request-id.
 *
 * @returns {{user: number, group: number}|null} số tin MỚI thấy mỗi lane; null = đang chạy dở (busy)
 */
export async function deepThreadBackfill(slot, { days = 30, maxRounds = DEEP_MAX_ROUNDS } = {}) {
    const listener = slot?.api?.listener;
    if (typeof listener?.requestOldMessages !== 'function') {
        return { user: 0, group: 0 };
    }
    if (slot._deepBackfillRunning) {
        return null;
    }
    slot._deepBackfillRunning = true;
    const cutoffTs = Date.now() - days * 86400000;
    const totals = { user: 0, group: 0 };

    try {
        for (const [lane, threadType] of [['user', ThreadType.User], ['group', ThreadType.Group]]) {
            const seenMsgIds = new Set();
            let lastMsgId = null;

            for (let round = 0; round < maxRounds; round++) {
                const batch = await requestAndWaitBatch(slot, listener, threadType, lastMsgId);
                if (!batch || batch.length === 0) {
                    break;
                }

                let oldest = null;
                let fresh = 0;
                for (const item of batch) {
                    const rawD = item?.data;
                    const msgId = String(rawD?.msgId ?? '');
                    if (msgId && !seenMsgIds.has(msgId)) {
                        seenMsgIds.add(msgId);
                        fresh++;
                    }
                    const ts = Number(rawD?.ts ?? 0);
                    if (ts > 0 && (oldest === null || ts < oldest.ts)) {
                        oldest = { ts, msgId };
                    }
                }
                totals[lane] += fresh;

                if (fresh === 0 || !oldest?.msgId) {
                    break; // cursor không lùi thêm được
                }
                if (oldest.ts <= cutoffTs) {
                    break; // đã phủ đủ cửa sổ days
                }
                lastMsgId = oldest.msgId;
                await new Promise((resolve) => setTimeout(resolve, DEEP_ROUND_DELAY_MS));
            }
            console.info(`deep backfill: lane ${lane} xong — ${totals[lane]} tin (days=${days})`);
        }
        return totals;
    } finally {
        slot._deepBackfillRunning = false;
    }
}

/** Gửi 1 request và chờ batch old_messages cùng lane (timeout → null). */
function requestAndWaitBatch(slot, listener, threadType, lastMsgId) {
    const laneNum = threadType === ThreadType.Group ? 1 : 0;
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            slot.onOldMessagesBatch = null;
            resolve(null);
        }, DEEP_BATCH_WAIT_MS);

        slot.onOldMessagesBatch = (batchThreadType, items) => {
            if (Number(batchThreadType) !== laneNum) {
                return; // batch lane khác (gap-fill xen kẽ) — chờ tiếp
            }
            clearTimeout(timer);
            slot.onOldMessagesBatch = null;
            resolve(items);
        };

        try {
            listener.requestOldMessages(threadType, lastMsgId);
        } catch (e) {
            clearTimeout(timer);
            slot.onOldMessagesBatch = null;
            console.warn('deep backfill: request fail', e?.message || e);
            resolve(null);
        }
    });
}

/**
 * @param {object} slot - slot state (cần slot.api, slot.personalUid)
 * @param {object} opts
 * @param {function} opts.enqueue - outbox.enqueue
 * @param {function} opts.buildInboundPayload - hàm build payload cùng format live listener
 * @param {number|null} opts.gapMs - ước tính độ dài gap (ms); null = không biết
 */
export async function backfillOnReconnect(slot, { enqueue, buildInboundPayload, gapMs }) {
    if (!slot?.api?.getUnreadMark || !slot.personalUid) return;

    let unread;
    try {
        unread = await slot.api.getUnreadMark();
    } catch (e) {
        console.error('backfill: getUnreadMark fail', e?.message || e);
        return;
    }

    // M-5: shape verified {data:{convsGroup,convsUser}, status}
    // mỗi item {id, cliMsgId, fromUid, ts} — chỉ là marker, không có nội dung
    const groups = unread?.data?.convsGroup ?? [];
    if (groups.length === 0) return;

    // C-3: count động theo độ dài gap, cap trần an toàn
    // API không có cursor → chỉ lấy N tin gần nhất
    const count = Math.min(200, Math.max(50, Math.ceil(((gapMs ?? 0) / 60000) * 10)));

    for (const g of groups) {
        const groupId = String(g.id);
        let res;
        try {
            res = await slot.api.getGroupChatHistory(groupId, count);
        } catch (e) {
            console.error('backfill: getGroupChatHistory fail', groupId, e?.message || e);
            continue;
        }

        const msgs = res?.groupMsgs ?? [];
        for (const m of msgs) {
            const rawD = m?.data;
            if (!rawD) continue;

            // C-1: is_self theo uid thật, KHÔNG tin message.isSelf
            // (history trả uidFrom thật, live trả "0" cho self)
            const isSelf = String(rawD.uidFrom) === String(slot.personalUid);

            let payload;
            try {
                payload = buildInboundPayload(slot, groupId, rawD, isSelf);
            } catch (e) {
                console.error('backfill: buildInboundPayload fail', groupId, e?.message || e);
                continue;
            }

            if (!payload) continue;

            try {
                await enqueue(payload);
            } catch (e) {
                console.error('backfill: enqueue fail', e?.message || e);
            }
        }

        // C-3: res.more > count → log để banner phản ánh (không có cursor → không thể lấy thêm)
        if (Number(res?.more) > count) {
            console.warn(
                `backfill: group ${groupId} con ~${res.more} tin cu ngoai tam voi (API khong co cursor, lay duoc ${count} tin gan nhat)`
            );
        }
    }

    // convsUser (1-1): spike 1b (2026-07-04) — backfill 1-1 KHẢ THI qua
    // listener.requestOldMessages(ThreadType.User, null) → event old_messages →
    // relay-forwarder (P12) normalize per-item + dedup source_id. Chưa wire tự động
    // ở đây (phối P08 khi chuyển reconnect-backfill sang dispatcher generic).
}

/**
 * Tính gapMs từ slot (thời gian từ lần mất kết nối đến bây giờ).
 * slot.sessionLostAt được set khi listener nhận 'error'/'closed'.
 */
export function computeGapMs(slot) {
    if (!slot?.sessionLostAt || typeof slot.sessionLostAt !== 'number') return null;
    const gap = Date.now() - slot.sessionLostAt;
    return gap > 0 ? gap : null;
}
