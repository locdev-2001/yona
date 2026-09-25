/**
 * Hạn mức số phiên Zalo đồng thời một process bridge được giữ (`BRIDGE_MAX_SESSIONS`,
 * mặc định 50). Một process giữ phiên của MỌI tenant trong RAM (session-resilience.mjs)
 * — không hạn mức thì một khách hàng spam mở QR có thể kéo sập process cho mọi khách khác.
 *
 * Đo RAM thật trên mỗi phiên cần một lượt quét QR thật của người — chưa đo được ở đây,
 * chỉ export `rss` process qua /health (index.mjs) để founder tự đo khi có tài khoản thật.
 * Kế hoạch chia tải nhiều process khi hạn mức không đủ: xem docs/deployment.md.
 */

export const DEFAULT_MAX_SESSIONS = 50;

/** Slot đang giữ tài nguyên thật ở Zalo: đang chờ quét, đang đăng nhập, hoặc đã sẵn sàng. */
const ACTIVE_LOGIN_PHASES = new Set(['qr_waiting', 'logging_in', 'ready']);

export function resolveMaxSessions(env = process.env) {
    const raw = env.BRIDGE_MAX_SESSIONS;
    const parsed = Number(raw);
    if (!raw || !Number.isFinite(parsed) || parsed <= 0) {
        return DEFAULT_MAX_SESSIONS;
    }
    return Math.trunc(parsed);
}

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
