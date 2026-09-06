import { createHash } from 'node:crypto';

/**
 * P06 (inbox-multichannel-relayer) — derive stable source_id cho inbound message.
 * Hợp đồng L3: KHÔNG bao giờ khoá theo session/connection (connectionId đổi mỗi lần
 * reconnect — dùng nó sẽ tách cùng 1 tin thành 2 source_id qua reconnect, MAJOR bug).
 *
 * Priority: msgId thật (RAW, không prefix — giữ nguyên dạng legacy để alias-lookup
 * (message_source_aliases, P01/P02e) khớp trực tiếp không cần transform)
 *        → cliMsgId (ổn định qua session, chưa từng dùng trước P06) → hash nội dung
 *          bất biến (KHÔNG connectionId, KHÔNG Date.now() — C-2).
 */
export function deriveInboundSourceId(channel, accountUid, threadId, rawData) {
    const msgId = rawData?.msgId ?? rawData?.msgID;
    if (msgId != null && String(msgId).trim() !== '') {
        return String(msgId);
    }

    const cliMsgId = rawData?.cliMsgId ?? rawData?.cliMsgID;
    if (cliMsgId != null && String(cliMsgId).trim() !== '') {
        return `zps-cli:${channel}:${accountUid}:${threadId}:${cliMsgId}`;
    }

    // C-2: hash từ nội dung bất biến, không Date.now(), không connectionId.
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
            .update(`${threadId}\n${from}\n${ts}\n${content}`)
            .digest('hex')
    );
}
