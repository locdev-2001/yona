/**
 * Đồng hồ bấm giờ cho một lượt gửi tin ra Zalo: mỗi `lap(chặng)` ghi thời gian từ
 * mốc trước tới giờ, `summary()` trả một bản ghi phẳng để in ra MỘT dòng log.
 * `message_id` do Laravel gửi kèm để nối dòng này với log `zalo.send.timing` của app.
 */

export const SEND_TIMING_LOG_TAG = '[zalo-bridge:send-timing]';

function normalizeMessageId(messageId) {
    const text = String(messageId ?? '').trim();
    return /^\d{1,20}$/.test(text) ? text : null;
}

export function startSendTiming({ messageId, mediaKind, now = () => performance.now() } = {}) {
    const startedAt = now();
    let lastMarkAt = startedAt;
    const stages = {};
    let bytes = null;

    return {
        lap(stage) {
            const at = now();
            stages[`${stage}_ms`] = Math.round(at - lastMarkAt);
            lastMarkAt = at;
        },
        recordBytes(size) {
            bytes = Number.isFinite(size) ? size : null;
        },
        summary({ ok }) {
            return {
                message_id: normalizeMessageId(messageId),
                media_kind: mediaKind || 'text',
                bytes,
                ...stages,
                total_ms: Math.round(now() - startedAt),
                ok: Boolean(ok),
            };
        },
    };
}
