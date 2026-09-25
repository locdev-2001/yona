/**
 * Hạn mức số phiên Zalo đồng thời một process bridge được giữ. Một process giữ
 * phiên của MỌI tenant trong RAM (session-resilience.mjs) — không hạn mức thì
 * một khách hàng spam mở QR có thể kéo sập process cho mọi khách khác.
 */

/** Chưa có dữ liệu RAM/phiên thật để tinh chỉnh — cố định tới khi có. */
export const MAX_SESSIONS = 50;

/** Slot đang giữ tài nguyên thật ở Zalo: đang chờ quét, đang đăng nhập, hoặc đã sẵn sàng. */
const ACTIVE_LOGIN_PHASES = new Set(['qr_waiting', 'logging_in', 'ready']);

/** @param {Map<string, {loginPhase?: string}>} slots */
export function countActiveSlots(slots) {
    let count = 0;
    for (const slot of slots.values()) {
        if (ACTIVE_LOGIN_PHASES.has(slot?.loginPhase)) {
            count += 1;
        }
    }
    return count;
}

/** @param {Map<string, {loginPhase?: string}>} slots */
export function sessionCapExceeded(slots, maxSessions) {
    return countActiveSlots(slots) >= maxSessions;
}
