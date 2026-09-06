/**
 * relay-forwarder.test.mjs — P12: né 5 wired + cipher_key (B3/B6), lane tách
 * durable/fire-and-forget (H3), old_messages normalize per-item (B5),
 * idempotent attach (MED-2). Chạy: node --test.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { attachRelayForwarder, relaySink } from './relay-forwarder.mjs';
import { ZCA_EVENTS, NO_FORWARD_EVENTS } from './zca-adapter.mjs';

function makeSlot() {
    const listener = new EventEmitter();
    return {
        api: { listener },
        personalUid: 'uid_self_777',
        botId: 42,
        _connectionId: 7,
        forwarderAttached: false,
        listener,
    };
}

function makeDeps() {
    const calls = { enqueued: [], fired: [], built: [] };
    return {
        calls,
        deps: {
            enqueue: (body) => calls.enqueued.push(body),
            postFireAndForget: (body) => calls.fired.push(body),
            // mirror chữ ký buildGroupBackfillPayload(slot, threadId, rawD, isSelf, threadType)
            buildInboundPayload: (slot, threadId, rawD, isSelf, threadType) => {
                const p = {
                    connection_id: slot._connectionId,
                    bot_id: slot.botId,
                    thread_id: threadId,
                    thread_type: threadType,
                    is_self: isSelf,
                    source_id: String(rawD?.msgId ?? ''),
                    backfill: true,
                };
                calls.built.push(p);
                return p;
            },
        },
    };
}

// ── B3/B6: subscribe đúng 10, né 5 wired + cipher_key ────────────────────────

test('forwarder subscribe đúng 10 event — KHÔNG message/error/closed/group_event/friend_event/cipher_key', () => {
    const slot = makeSlot();
    const { deps } = makeDeps();
    const subscribed = attachRelayForwarder(slot, deps);
    assert.equal(subscribed.length, 10);
    for (const wired of NO_FORWARD_EVENTS) {
        assert.ok(!subscribed.includes(wired), `${wired} không được forward`);
        assert.equal(slot.listener.listenerCount(wired), 0, `${wired} không có listener từ forwarder`);
    }
    for (const evt of ZCA_EVENTS.filter((e) => !NO_FORWARD_EVENTS.has(e))) {
        assert.equal(slot.listener.listenerCount(evt), 1, `${evt} phải có đúng 1 listener`);
    }
});

test('MED-2: attach lần 2 trên cùng slot/api → no-op, không double listener', () => {
    const slot = makeSlot();
    const { deps } = makeDeps();
    assert.equal(attachRelayForwarder(slot, deps).length, 10);
    assert.equal(attachRelayForwarder(slot, deps).length, 0);
    assert.equal(slot.listener.listenerCount('typing'), 1);
});

test('B6: emit message + cipher_key → sink KHÔNG nhận (0 forward, 0 enqueue)', () => {
    const slot = makeSlot();
    const { calls, deps } = makeDeps();
    attachRelayForwarder(slot, deps);
    slot.listener.emit('message', { data: { msgId: 'live1' } });
    slot.listener.emit('cipher_key', 'super-secret-key-material');
    assert.equal(calls.enqueued.length, 0);
    assert.equal(calls.fired.length, 0);
});

// ── B5: old_messages per-item normalize, durable lane ────────────────────────

test('B5: old_messages array 2 tin (group + 1-1) → 2 enqueue durable, source_id=msgId, thread_type đúng', () => {
    const slot = makeSlot();
    const { calls, deps } = makeDeps();
    attachRelayForwarder(slot, deps);
    slot.listener.emit('old_messages', [
        { type: 1, threadId: 'g100', data: { msgId: '8005215164474', uidFrom: 'peer1', content: 'a' } },
        { type: 0, threadId: 'u200', data: { msgId: '8005215164475', uidFrom: 'uid_self_777', content: 'b' } },
    ]);
    assert.equal(calls.enqueued.length, 2);
    assert.equal(calls.fired.length, 0);
    const [g, u] = calls.enqueued;
    assert.equal(g.thread_type, 1);
    assert.equal(g.source_id, '8005215164474');
    assert.equal(g.is_self, false);
    assert.equal(u.thread_type, 0);
    assert.equal(u.source_id, '8005215164475');
    assert.equal(u.is_self, true); // C-1: so uid thật
    // MED-3: source_id = msgId TRẦN → trùng msgId với live → cùng source_id → Laravel dedup 1 row
});

test('old_messages: item hỏng (thiếu data/threadId) bị bỏ qua, không throw', () => {
    const slot = makeSlot();
    const { calls, deps } = makeDeps();
    attachRelayForwarder(slot, deps);
    slot.listener.emit('old_messages', [{ type: 0 }, null, { type: 0, threadId: 'u1', data: { msgId: 'ok1' } }]);
    assert.equal(calls.enqueued.length, 1);
    assert.equal(calls.enqueued[0].source_id, 'ok1');
});

// ── H2/H3: envelope + lane tách ──────────────────────────────────────────────

test('H3: typing/seen/delivered/reaction/connected/disconnected → fire-and-forget, KHÔNG vào outbox', () => {
    const slot = makeSlot();
    const { calls, deps } = makeDeps();
    attachRelayForwarder(slot, deps);
    for (const evt of ['typing', 'seen_messages', 'delivered_messages', 'reaction', 'old_reactions', 'upload_attachment', 'connected', 'disconnected']) {
        slot.listener.emit(evt, { some: 'payload' });
    }
    assert.equal(calls.enqueued.length, 0);
    assert.equal(calls.fired.length, 8);
    for (const env of calls.fired) {
        // H2: envelope đủ connection_id — thiếu là Laravel 400 dead-letter
        assert.equal(env.type, 'relay_event');
        assert.equal(env.connection_id, 7);
        assert.equal(env.bot_id, 42);
        assert.equal(env.personal_uid, 'uid_self_777');
        assert.ok(typeof env.event_type === 'string' && env.event_type.length > 0);
    }
});

test('undo → outbox DURABLE với envelope relay_event + source_id idempotent', () => {
    const slot = makeSlot();
    const { calls, deps } = makeDeps();
    attachRelayForwarder(slot, deps);
    slot.listener.emit('undo', { threadId: 'u200', data: { msgId: '9990001', content: { cliMsgId: 'c1' } } });
    assert.equal(calls.fired.length, 0);
    assert.equal(calls.enqueued.length, 1);
    const env = calls.enqueued[0];
    assert.equal(env.type, 'relay_event');
    assert.equal(env.event_type, 'undo');
    assert.equal(env.source_id, '9990001'); // msgId priority của deriveInboundSourceId
    assert.equal(env.connection_id, 7);
});

test('sink không bao giờ ném ngược vào emitter (payload không serialize được)', () => {
    const slot = makeSlot();
    const { calls, deps } = makeDeps();
    attachRelayForwarder(slot, deps);
    const cyclic = {};
    cyclic.self = cyclic;
    slot.listener.emit('typing', cyclic); // sanitizePlain → null, không throw
    assert.equal(calls.fired.length, 1);
    assert.equal(calls.fired[0].payload, null);
});

// ── relaySink export trực tiếp (unit, không qua emitter) ─────────────────────

test('relaySink: event lạ (zca version mới) → durable enqueue, không mất (H1)', () => {
    const slot = makeSlot();
    const { calls, deps } = makeDeps();
    relaySink(slot, 'brand_new_event', [{ x: 1 }], deps);
    assert.equal(calls.enqueued.length, 1);
    assert.equal(calls.enqueued[0].event_type, 'brand_new_event');
});
