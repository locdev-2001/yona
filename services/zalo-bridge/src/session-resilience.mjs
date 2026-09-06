/**
 * session-resilience.mjs — Lô 1 "BRIDGE-SỐNG": giữ bridge sống khi WebSocket Zalo
 * rớt và khi một handler ném lỗi.
 *
 * Ba việc, tách khỏi index.mjs để test được mà không boot cả HTTP server:
 *   1. `classifyListenerError` — zca-js dùng CHUNG event `error` cho lỗi đường
 *      truyền (ws.onerror) và lỗi giải mã một frame (catch trong ws.onmessage,
 *      `node_modules/zca-js/dist/apis/listen.js`). Gộp hai loại lại thành
 *      "mất phiên" khoá gửi giả và không bao giờ tự hồi.
 *   2. `createReconnectSupervisor` — zca-js chỉ tự thử lại với các mã server cho
 *      phép (`close_and_retry_codes`) và có hạn mức; hết hạn mức nó phát `closed`
 *      rồi im. Supervisor nhận `closed` cho MỌI mã và tự đăng nhập lại từ cookie
 *      đã lưu, backoff 5s → 5m.
 *   3. `createBridgeResilience` — bọc handler (`safeAsync`) và chốt chặn cuối
 *      `unhandledRejection` / `uncaughtException`. Một process phục vụ mọi tenant
 *      nên KHÔNG thoát: thoát = mọi khách mất inbox và phải quét lại QR.
 */

/** Backoff đăng nhập lại: 5s → 15s → 30s → 1m → 2m → 5m (giữ nguyên 5m về sau). */
export const RECONNECT_BACKOFF_MS = [5_000, 15_000, 30_000, 60_000, 120_000, 300_000];

export function reconnectDelayMs(attempt) {
    const n = Number.isFinite(attempt) ? Math.trunc(attempt) : 1;
    const index = Math.min(Math.max(n, 1), RECONNECT_BACKOFF_MS.length) - 1;
    return RECONNECT_BACKOFF_MS[index];
}

// Lỗi đường truyền: mã lỗi socket của Node + thông điệp đặc trưng của thư viện `ws`.
const TRANSPORT_ERROR_CODES = new Set([
    'ECONNRESET', 'ECONNREFUSED', 'ECONNABORTED', 'EPIPE', 'ETIMEDOUT', 'ENOTFOUND',
    'EAI_AGAIN', 'EHOSTUNREACH', 'ENETUNREACH', 'ENETDOWN', 'EPROTO', 'ERR_SOCKET_CLOSED',
]);

const TRANSPORT_MESSAGE_PATTERN =
    /socket hang up|websocket|unexpected server response|connection (?:closed|reset|refused|timed out)|network (?:error|is unreachable)|handshake|tls|certificate/i;

/**
 * 'transport' = WebSocket đứt (phải báo mất phiên + nối lại).
 * 'decode'    = một frame hỏng (đếm rồi đi tiếp — phiên vẫn sống).
 * Mặc định nghiêng về 'decode': lỗi đường truyền luôn kéo theo `closed`/`disconnected`
 * nên nhận nhầm về phía 'decode' vẫn được cứu, còn nhận nhầm về phía 'transport'
 * chính là con bug "khoá gửi giả" 1.3.
 */
export function classifyListenerError(error) {
    if (!error) {
        return 'decode';
    }
    if (typeof error === 'object') {
        // ErrorEvent của thư viện `ws` (ws.onerror) — có `target` là chính socket.
        if ('target' in error || error.type === 'error' || error.error instanceof Error) {
            return 'transport';
        }
        if (typeof error.code === 'string' && TRANSPORT_ERROR_CODES.has(error.code)) {
            return 'transport';
        }
    }
    const message = typeof error === 'string' ? error : String(error?.message ?? '');
    return TRANSPORT_MESSAGE_PATTERN.test(message) ? 'transport' : 'decode';
}

/**
 * Điều phối đăng nhập lại theo slot. `relogin(slotKey)` trả:
 *   'ok'      — phiên đã sống lại, dừng.
 *   'retry'   — chưa được, hẹn lần sau với backoff dài hơn.
 *   'abandon' — không còn gì để khôi phục (đã logout / mất cookie), dừng hẳn.
 * Ném lỗi cũng coi như 'retry'.
 */
export function createReconnectSupervisor({ relogin, timers = globalThis, onEvent = () => {} }) {
    const entries = new Map();

    function entryFor(slotKey) {
        const key = String(slotKey);
        if (!entries.has(key)) {
            entries.set(key, { attempt: 0, timer: null, running: false });
        }
        return entries.get(key);
    }

    function cancel(slotKey) {
        const key = String(slotKey);
        const entry = entries.get(key);
        if (!entry) {
            return false;
        }
        if (entry.timer !== null) {
            timers.clearTimeout(entry.timer);
        }
        entries.delete(key);
        return true;
    }

    function schedule(slotKey, reason = '') {
        const key = String(slotKey);
        const entry = entryFor(key);
        // `closed` và `error` cùng bắn cho một lần rớt — chỉ nhận lịch đầu tiên.
        if (entry.timer !== null || entry.running) {
            return false;
        }
        entry.attempt += 1;
        const delayMs = reconnectDelayMs(entry.attempt);
        onEvent({ type: 'scheduled', slotKey: key, attempt: entry.attempt, delayMs, reason });
        entry.timer = timers.setTimeout(() => {
            entry.timer = null;
            void runNow(key);
        }, delayMs);
        if (typeof entry.timer?.unref === 'function') {
            entry.timer.unref();
        }
        return true;
    }

    async function runNow(slotKey) {
        const key = String(slotKey);
        const entry = entryFor(key);
        entry.running = true;
        let outcome = 'retry';
        try {
            outcome = (await relogin(key)) ?? 'retry';
        } catch (error) {
            outcome = 'retry';
            onEvent({ type: 'failed', slotKey: key, attempt: entry.attempt, error });
        } finally {
            entry.running = false;
        }
        if (outcome === 'ok') {
            const attempt = entry.attempt;
            cancel(key);
            onEvent({ type: 'recovered', slotKey: key, attempt });
            return outcome;
        }
        if (outcome === 'abandon') {
            cancel(key);
            onEvent({ type: 'abandoned', slotKey: key });
            return outcome;
        }
        schedule(key, 'retry');
        return outcome;
    }

    return {
        schedule,
        cancel,
        runNow,
        attemptOf: (slotKey) => entries.get(String(slotKey))?.attempt ?? 0,
        isPending: (slotKey) => {
            const entry = entries.get(String(slotKey));
            return Boolean(entry && (entry.timer !== null || entry.running));
        },
        pendingKeys: () => [...entries.keys()],
    };
}

/**
 * Nối vòng đời phiên vào listener zca: `error` (phân loại transport/decode) và
 * `closed` (mọi mã → mất phiên + hẹn nối lại). Ở đây thay vì trong index.mjs để
 * test chạy đúng dây thật với một EventEmitter giả.
 *
 * @param {{on: Function}} listener
 * @param {object} deps
 *   slotKey          — khoá slot cho supervisor
 *   supervisor       — createReconnectSupervisor(...)
 *   resilience       — createBridgeResilience(...)
 *   isCurrent()      — false khi listener này không còn sở hữu slot (đang gỡ / đã thay)
 *   isKickCode(code) — true khi phiên bị kết nối khác chiếm (nối lại chỉ đá qua đá lại)
 *   markSessionLost(reason) — đánh dấu + báo Laravel
 *   onFrameError(error)     — frame giải mã hỏng (KHÔNG đổi phase)
 */
export function attachSessionLifecycle(listener, {
    slotKey,
    supervisor,
    resilience,
    isCurrent = () => true,
    isKickCode = () => false,
    markSessionLost,
    onFrameError = () => {},
    logger = console,
}) {
    if (typeof markSessionLost !== 'function') {
        // Ném ngay lúc nối dây, không để lộ ra ở lần rớt mạng đầu tiên rồi im lặng.
        throw new TypeError('attachSessionLifecycle: markSessionLost la bat buoc');
    }
    const attached = [];
    const on = (event, handler) => {
        try {
            listener.on(event, resilience.safeAsync(`listener.${event}`, handler));
            attached.push(event);
        } catch (error) {
            logger.warn(`zalo-bridge: listener.on(${event}) not available`, error?.message || error);
        }
    };

    // 1.3: zca-js phát CÙNG event 'error' cho lỗi đường truyền (ws.onerror) và cho
    // lỗi giải mã một frame (catch trong ws.onmessage). Chỉ lỗi đường truyền mới là
    // mất phiên; gộp cả hai lại chính là con bug "khoá gửi giả, không tự hồi".
    on('error', (error) => {
        if (!isCurrent()) {
            return;
        }
        if (classifyListenerError(error) === 'decode') {
            resilience.noteFrameError(error);
            onFrameError(error);
            return;
        }
        markSessionLost(`listener_error: ${error?.message || String(error || 'unknown')}`);
        supervisor.schedule(slotKey, 'listener_error');
    });

    // 1.1: `closed` = zca-js đã thôi tự thử lại (mã ngoài close_and_retry_codes hoặc
    // hết hạn mức). MỌI mã đều là mất phiên — trước đây chỉ bắt 3000/3003 nên rớt
    // mạng thường ⇒ inbox điếc im lặng mà Yona vẫn hiện "đang kết nối".
    on('closed', (code, reason) => {
        if (!isCurrent()) {
            return;
        }
        markSessionLost(`ws_closed_${code}_${reason || ''}`);
        if (isKickCode(code)) {
            logger.warn('zalo-bridge: phien bi chiem boi ket noi khac slot=', slotKey);
            return;
        }
        supervisor.schedule(slotKey, `ws_closed_${code}`);
    });

    return attached;
}

/**
 * Bọc handler + chốt chặn process. Trả về một instance riêng (không singleton
 * toàn module) để test dựng được nhiều bản độc lập.
 */
export function createBridgeResilience({ logger = console } = {}) {
    const counters = {
        since: Date.now(),
        handler_error: 0,
        frame_error: 0,
        unhandled_rejection: 0,
        uncaught_exception: 0,
        relogin_scheduled: 0,
        relogin_ok: 0,
        relogin_failed: 0,
    };
    let lastHandlerError = null;
    let lastFrameError = null;
    const guardedProcesses = new WeakSet();

    function describe(error) {
        if (error instanceof Error) {
            return error.message || error.name;
        }
        return String(error?.message ?? error ?? 'unknown');
    }

    function noteHandlerError(label, error) {
        counters.handler_error += 1;
        lastHandlerError = { label, message: describe(error), at: Date.now() };
        logger.error('zalo-bridge: handler error', label, describe(error));
    }

    /**
     * Handler listener chạy dưới EventEmitter: lỗi đồng bộ ném thẳng ra emitter,
     * lỗi bất đồng bộ thành unhandledRejection — cả hai đều đủ giết process.
     */
    function safeAsync(label, fn) {
        return (...args) => {
            try {
                const result = fn(...args);
                if (result && typeof result.then === 'function') {
                    return result.then(undefined, (error) => {
                        noteHandlerError(label, error);
                    });
                }
                return result;
            } catch (error) {
                noteHandlerError(label, error);
                return undefined;
            }
        };
    }

    function installProcessGuards(proc = process) {
        if (guardedProcesses.has(proc)) {
            return false;
        }
        guardedProcesses.add(proc);
        proc.on('unhandledRejection', (reason) => {
            counters.unhandled_rejection += 1;
            lastHandlerError = { label: 'unhandledRejection', message: describe(reason), at: Date.now() };
            logger.error('zalo-bridge: unhandledRejection (bo qua, khong thoat)', describe(reason));
        });
        // KHÔNG process.exit: một process giữ phiên Zalo của MỌI tenant, thoát =
        // mọi khách mất inbox và phải quét lại QR. pm2 vẫn restart khi process chết thật.
        proc.on('uncaughtException', (error) => {
            counters.uncaught_exception += 1;
            lastHandlerError = { label: 'uncaughtException', message: describe(error), at: Date.now() };
            logger.error('zalo-bridge: uncaughtException (bo qua, khong thoat)', describe(error), error?.stack || '');
        });
        return true;
    }

    function noteFrameError(error) {
        counters.frame_error += 1;
        lastFrameError = { message: describe(error), at: Date.now() };
    }

    function noteReconnectEvent(event) {
        if (event.type === 'scheduled') {
            counters.relogin_scheduled += 1;
            logger.warn(
                'zalo-bridge: hen dang nhap lai slot=', event.slotKey,
                'attempt=', event.attempt, 'delay_ms=', event.delayMs, 'reason=', event.reason || ''
            );
            return;
        }
        if (event.type === 'recovered') {
            counters.relogin_ok += 1;
            logger.info('zalo-bridge: dang nhap lai THANH CONG slot=', event.slotKey, 'attempt=', event.attempt);
            return;
        }
        if (event.type === 'failed') {
            counters.relogin_failed += 1;
            logger.warn('zalo-bridge: dang nhap lai loi slot=', event.slotKey, describe(event.error));
            return;
        }
        if (event.type === 'abandoned') {
            logger.warn('zalo-bridge: ngung dang nhap lai slot=', event.slotKey, '(khong con phien de khoi phuc)');
        }
    }

    return {
        safeAsync,
        installProcessGuards,
        noteFrameError,
        noteHandlerError,
        noteReconnectEvent,
        stats: () => ({
            ...counters,
            last_handler_error: lastHandlerError,
            last_frame_error: lastFrameError,
        }),
    };
}
