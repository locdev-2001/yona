/**
 * redact.mjs — Lô 1 (1.7): log mặc định KHÔNG mang nội dung tin của khách hay
 * định danh đầy đủ. pm2 không xoay log; một dump 16KB mỗi tin biến file log
 * thành bản sao inbox nằm ngoài mọi kiểm soát truy cập.
 *
 * Nguyên tắc: chi tiết chỉ hiện khi bật cờ debug tường minh; mặc định chỉ còn
 * khoá tra cứu (msgId/threadId) và định danh đã che.
 */

/** Cờ debug chung: `ZALO_BRIDGE_DEBUG_LOG=1`. Opt-IN — không có cờ thì im. */
export function debugLogEnabled(env = process.env) {
    return String(env.ZALO_BRIDGE_DEBUG_LOG ?? '') === '1';
}

/**
 * Dump raw payload (quote-inspect, friend-request…): `ZALO_BRIDGE_LOG_QUOTE=1`
 * hoặc cờ debug chung. Trước 07/09/2026 mặc định là BẬT (chỉ tắt khi `=== '0'`).
 */
export function rawPayloadLogEnabled(env = process.env) {
    return String(env.ZALO_BRIDGE_LOG_QUOTE ?? '') === '1' || debugLogEnabled(env);
}

/** Token QR trong log: 8 ký tự đầu là đủ để tra, không đủ để mượn phiên. */
export function shortToken(token) {
    const value = String(token ?? '').trim();
    if (value === '') {
        return '';
    }
    return value.length <= 8 ? value : `${value.slice(0, 8)}…`;
}

/** uid Zalo: giữ 4 số cuối để đối chiếu, che phần còn lại. */
export function maskUid(uid) {
    const value = String(uid ?? '').trim();
    if (value === '') {
        return '';
    }
    if (value.length <= 4) {
        return '*'.repeat(value.length);
    }
    return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
}

/** Cảnh báo lúc boot khi dump raw còn bật ở production. */
export function rawPayloadLogWarning(env = process.env) {
    if (!rawPayloadLogEnabled(env)) {
        return null;
    }
    if (String(env.NODE_ENV ?? '') !== 'production') {
        return null;
    }
    return 'zalo-bridge: CANH BAO — log raw payload dang BAT o production (ZALO_BRIDGE_LOG_QUOTE/ZALO_BRIDGE_DEBUG_LOG). Log se chua noi dung tin cua khach.';
}
