/**
 * Self-check session-resilience.mjs (Lô 1: 1.1 nối lại WS · 1.2 chống sập ·
 * 1.3 tách lỗi decode khỏi lỗi transport).
 * Chạy: node --test src/session-resilience.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import EventEmitter from 'node:events';
import {
    attachSessionLifecycle,
    classifyListenerError,
    createBridgeResilience,
    createReconnectSupervisor,
    reconnectDelayMs,
    RECONNECT_BACKOFF_MS,
} from './session-resilience.mjs';

const silentLogger = { info() {}, warn() {}, error() {} };

/** Timers giả: giữ callback lại để test tự bấm giờ, không phải chờ thật. */
function fakeTimers() {
    const queued = new Map();
    let nextId = 1;
    return {
        delays: [],
        setTimeout(fn, delayMs) {
            const id = nextId++;
            this.delays.push(delayMs);
            queued.set(id, fn);
            return id;
        },
        clearTimeout(id) {
            queued.delete(id);
        },
        /** Chạy mọi callback đang chờ (theo thứ tự đăng ký). */
        async fire() {
            const pending = [...queued.entries()];
            queued.clear();
            for (const [, fn] of pending) {
                await fn();
            }
        },
        pendingCount: () => queued.size,
    };
}

/** Dàn dựng đúng dây thật của startListenerForSlot với listener giả. */
function makeLifecycleHarness({ relogin } = {}) {
    const listener = new EventEmitter();
    const sessionPosts = [];
    const frameErrors = [];
    const timers = fakeTimers();
    const resilience = createBridgeResilience({ logger: silentLogger });
    const supervisor = createReconnectSupervisor({
        relogin: relogin ?? (() => 'ok'),
        timers,
        onEvent: (event) => resilience.noteReconnectEvent(event),
    });
    attachSessionLifecycle(listener, {
        slotKey: '7',
        supervisor,
        resilience,
        isKickCode: (code) => code === 3000 || code === 3003,
        markSessionLost: (reason) => sessionPosts.push({ state: 'session_lost', detail: reason }),
        onFrameError: (error) => frameErrors.push(error),
        logger: silentLogger,
    });

    return { listener, sessionPosts, frameErrors, timers, supervisor, resilience };
}

test('1.3: lỗi giải mã một frame → đếm frame_error, KHÔNG báo mất phiên', () => {
    const h = makeLifecycleHarness();

    h.listener.emit('error', new SyntaxError('Unexpected token < in JSON at position 0'));

    assert.equal(h.sessionPosts.length, 0, 'frame hỏng không được báo session_lost');
    assert.equal(h.frameErrors.length, 1);
    assert.equal(h.resilience.stats().frame_error, 1);
    assert.equal(h.timers.pendingCount(), 0, 'không hẹn đăng nhập lại vì phiên vẫn sống');
});

test('1.3: lỗi đường truyền (ErrorEvent của ws) → mất phiên + hẹn nối lại', () => {
    const h = makeLifecycleHarness();

    h.listener.emit('error', { type: 'error', target: {}, message: 'socket hang up' });

    assert.equal(h.sessionPosts.length, 1);
    assert.match(h.sessionPosts[0].detail, /^listener_error:/);
    assert.equal(h.resilience.stats().frame_error, 0);
    assert.equal(h.timers.pendingCount(), 1);
});

test('1.1: ws close 1006 → post session_lost rồi relogin theo backoff 5s', async () => {
    const reloginCalls = [];
    const h = makeLifecycleHarness({
        relogin: (slotKey) => {
            reloginCalls.push(slotKey);
            return 'ok';
        },
    });

    h.listener.emit('closed', 1006, 'Abnormal Closure');

    assert.deepEqual(h.sessionPosts, [{ state: 'session_lost', detail: 'ws_closed_1006_Abnormal Closure' }]);
    assert.deepEqual(h.timers.delays, [5000], 'lần đầu nối lại sau 5s');
    assert.equal(reloginCalls.length, 0, 'chưa tới hạn thì chưa gọi');

    await h.timers.fire();

    assert.deepEqual(reloginCalls, ['7']);
    assert.equal(h.resilience.stats().relogin_ok, 1);
    assert.equal(h.supervisor.isPending('7'), false, 'nối lại xong thì thôi hẹn');
});

test('1.1: relogin hỏng liên tiếp → backoff nới dần 5s→15s→30s, không bỏ cuộc', async () => {
    const h = makeLifecycleHarness({ relogin: () => 'retry' });

    h.listener.emit('closed', 1006, '');
    await h.timers.fire();
    await h.timers.fire();

    assert.deepEqual(h.timers.delays, [5000, 15000, 30000]);
    assert.equal(h.supervisor.attemptOf('7'), 3);
    assert.equal(h.resilience.stats().relogin_failed, 0, "'retry' không phải lỗi ném");
});

test('1.1: relogin trả abandon (đã logout) → dừng hẳn, không hẹn nữa', async () => {
    const h = makeLifecycleHarness({ relogin: () => 'abandon' });

    h.listener.emit('closed', 1006, '');
    await h.timers.fire();

    assert.equal(h.timers.pendingCount(), 0);
    assert.equal(h.supervisor.isPending('7'), false);
    assert.deepEqual(h.timers.delays, [5000]);
});

test('1.1: relogin ném lỗi → đếm relogin_failed và vẫn hẹn lần sau', async () => {
    const h = makeLifecycleHarness({
        relogin: () => {
            throw new Error('cookie het han');
        },
    });

    h.listener.emit('closed', 1006, '');
    await h.timers.fire();

    assert.equal(h.resilience.stats().relogin_failed, 1);
    assert.deepEqual(h.timers.delays, [5000, 15000]);
});

test('1.1: mã 3000/3003 (phiên bị chiếm) → báo mất phiên nhưng KHÔNG nối lại', () => {
    const h = makeLifecycleHarness();

    h.listener.emit('closed', 3003, 'KickConnection');

    assert.equal(h.sessionPosts.length, 1);
    assert.equal(h.timers.pendingCount(), 0, 'nối lại chỉ đá qua đá lại với phiên kia');
});

test('1.1: closed và error cùng bắn cho một lần rớt → chỉ MỘT lịch nối lại', () => {
    const h = makeLifecycleHarness({ relogin: () => 'retry' });

    h.listener.emit('error', { type: 'error', target: {}, message: 'socket hang up' });
    h.listener.emit('closed', 1006, '');

    assert.deepEqual(h.timers.delays, [5000]);
    assert.equal(h.timers.pendingCount(), 1);
});

test('1.1: listener của lần login trước phát muộn → bỏ qua (isCurrent=false)', () => {
    const listener = new EventEmitter();
    const sessionPosts = [];
    const timers = fakeTimers();
    const resilience = createBridgeResilience({ logger: silentLogger });
    const supervisor = createReconnectSupervisor({ relogin: () => 'ok', timers });
    attachSessionLifecycle(listener, {
        slotKey: '7',
        supervisor,
        resilience,
        isCurrent: () => false,
        markSessionLost: (reason) => sessionPosts.push(reason),
        logger: silentLogger,
    });

    listener.emit('closed', 1006, '');
    listener.emit('error', { type: 'error', target: {} });

    assert.deepEqual(sessionPosts, []);
    assert.equal(timers.pendingCount(), 0);
});

test('1.2: handler ném lỗi đồng bộ → đếm handler_error, process sống tiếp', () => {
    const resilience = createBridgeResilience({ logger: silentLogger });
    const listener = new EventEmitter();
    const seen = [];
    listener.on('message', resilience.safeAsync('listener.message', () => {
        throw new Error('shape la tu Zalo');
    }));
    listener.on('message', resilience.safeAsync('listener.message2', () => {
        seen.push('handler sau van chay');
    }));

    assert.doesNotThrow(() => listener.emit('message', {}));
    assert.equal(resilience.stats().handler_error, 1);
    assert.equal(resilience.stats().last_handler_error.label, 'listener.message');
    assert.deepEqual(seen, ['handler sau van chay']);
});

test('1.2: handler async reject → nuốt lỗi, KHÔNG thành unhandledRejection', async () => {
    const resilience = createBridgeResilience({ logger: silentLogger });
    const handler = resilience.safeAsync('listener.message', async () => {
        throw new Error('getUserInfo 500');
    });

    await handler({});

    assert.equal(resilience.stats().handler_error, 1);
});

test('1.2: safeAsync trả nguyên giá trị khi handler chạy trót lọt', async () => {
    const resilience = createBridgeResilience({ logger: silentLogger });
    assert.equal(resilience.safeAsync('x', () => 42)(), 42);
    assert.equal(await resilience.safeAsync('y', async () => 'ok')(), 'ok');
    assert.equal(resilience.stats().handler_error, 0);
});

test('1.2: process guard đếm unhandledRejection/uncaughtException và KHÔNG thoát', () => {
    const resilience = createBridgeResilience({ logger: silentLogger });
    const fakeProcess = new EventEmitter();
    let exited = false;
    fakeProcess.exit = () => {
        exited = true;
    };

    assert.equal(resilience.installProcessGuards(fakeProcess), true);
    assert.equal(resilience.installProcessGuards(fakeProcess), false, 'cài hai lần không nhân đôi handler');

    fakeProcess.emit('unhandledRejection', new Error('lac o dau do'));
    fakeProcess.emit('uncaughtException', new Error('canRetry doc retryCount undefined'));

    const stats = resilience.stats();
    assert.equal(stats.unhandled_rejection, 1);
    assert.equal(stats.uncaught_exception, 1);
    assert.equal(exited, false, 'mot process giu phien cua MOI tenant — cam thoat');
});

test('classifyListenerError: mã lỗi socket của Node = transport', () => {
    assert.equal(classifyListenerError(Object.assign(new Error('read'), { code: 'ECONNRESET' })), 'transport');
    assert.equal(classifyListenerError(new Error('Unexpected server response: 502')), 'transport');
    assert.equal(classifyListenerError(new Error('Invalid header')), 'decode');
    assert.equal(classifyListenerError(null), 'decode');
});

test('reconnectDelayMs: kẹp trong bảng backoff, giữ 5m về sau', () => {
    assert.equal(reconnectDelayMs(0), 5000);
    assert.equal(reconnectDelayMs(1), 5000);
    assert.equal(reconnectDelayMs(6), 300000);
    assert.equal(reconnectDelayMs(99), 300000);
    assert.equal(RECONNECT_BACKOFF_MS.at(-1), 300000);
});

test('attachSessionLifecycle: thiếu markSessionLost → ném ngay lúc nối dây', () => {
    const resilience = createBridgeResilience({ logger: silentLogger });
    assert.throws(
        () => attachSessionLifecycle(new EventEmitter(), {
            slotKey: '7',
            supervisor: createReconnectSupervisor({ relogin: () => 'ok', timers: fakeTimers() }),
            resilience,
            logger: silentLogger,
        }),
        /markSessionLost/
    );
});
