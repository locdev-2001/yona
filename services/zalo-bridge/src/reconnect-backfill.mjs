/**
 * Tier 2 — Backfill khi reconnect Zalo.
 *
 * Dùng getUnreadMark() để biết nhóm nào có tin chưa đọc trong gap,
 * rồi getGroupChatHistory(groupId, count) để lấy N tin gần nhất.
 *
 * Giới hạn biết trước:
 * - API không có cursor → chỉ lấy N tin gần nhất, không phân trang
 * - 1-1 (convsUser): không có API lịch sử → không backfill được
 *   (banner Tier 0 đã cảnh báo, không hứa cứu)
 * - Zalo có tự dội lại tin 1-1 khi reconnect? Chưa biết — founder cần spike
 */

import { deriveInboundSourceId } from './inbound-source-id.mjs';

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

    // convsUser (1-1): zca-js KHÔNG co API lich su 1-1 → KHONG backfill duoc
    // Banner Tier 0 da canh bao. Spike: Zalo co tu doi lai tin 1-1 khi reconnect?
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
