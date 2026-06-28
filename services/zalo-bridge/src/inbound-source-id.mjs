import { createHash } from 'node:crypto';

/**
 * Derive stable source_id cho inbound message. KHÔNG bao giờ dùng Date.now() làm fallback
 * để tránh live vs backfill tạo 2 row khác nhau cho cùng 1 tin (C-2).
 *
 * Priority: msgId thật → hash deterministc từ (connectionId, threadId, from, ts, content)
 */
export function deriveInboundSourceId(connectionId, threadId, rawData) {
    const msgId = rawData?.msgId ?? rawData?.msgID;
    if (msgId != null && String(msgId).trim() !== '') {
        return String(msgId);
    }

    // C-2: hash từ nội dung bất biến, không Date.now()
    // Nếu thiếu ts+from: dedup theo content cùng thread (trùng nhau thì dedup nhầm 1 tin — chấp nhận)
    const ts = rawData?.ts ?? rawData?.msgTs ?? rawData?.sendTime ?? rawData?.clientTime ?? '';
    const from = rawData?.uidFrom ?? '';
    const content =
        typeof rawData?.content === 'string'
            ? rawData.content
            : JSON.stringify(rawData?.content ?? '');

    return (
        'zps-derived:' +
        createHash('sha256')
            .update(`${connectionId}\n${threadId}\n${from}\n${ts}\n${content}`)
            .digest('hex')
    );
}
