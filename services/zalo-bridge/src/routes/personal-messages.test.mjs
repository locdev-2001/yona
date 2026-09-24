import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { ThreadType } from 'zca-js';
import { classifyZcaError, firstSourceId, registerPersonalMessageRoutes } from './personal-messages.mjs';
import { zcaReactionCode } from '../reaction-icons.mjs';

const SEND_SECRET = 'secret-cho-test';

/** Dựng bridge tối thiểu: chỉ các route cửa ra, slot giả — KHÔNG đụng phiên Zalo thật. */
function startBridge({ slot = null, calls = [] } = {}) {
    const app = express();
    app.use(express.json());
    registerPersonalMessageRoutes(app, {
        checkSendSecret(req, res) {
            if ((req.header('X-Bridge-Send-Secret') || '') !== SEND_SECRET) {
                res.status(403).json({ ok: false, message: 'Forbidden' });
                return false;
            }
            return true;
        },
        getSlot: () => slot,
        resolveSlot: () => slot,
        bridgeSendTextOrMedia: async () => ({ source_id: 'x', source_ids: ['x'] }),
        ThreadType,
        zcaReactionCode,
    });
    return new Promise((resolve) => {
        const server = app.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            resolve({
                server,
                calls,
                async post(routePath, body, secret = SEND_SECRET) {
                    const res = await fetch(`http://127.0.0.1:${port}${routePath}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Bridge-Send-Secret': secret },
                        body: JSON.stringify(body),
                    });
                    return { status: res.status, body: await res.json() };
                },
            });
        });
    });
}

function readySlot(calls, overrides = {}) {
    return {
        loginPhase: 'ready',
        personalUid: '614700000000000000',
        api: {
            async addReaction(icon, dest) {
                calls.push(['addReaction', icon, dest]);
                return { msgIds: [98765] };
            },
            async undo(payload, threadId, type) {
                calls.push(['undo', payload, threadId, type]);
                return { status: 0 };
            },
            async sendTypingEvent(threadId, type) {
                calls.push(['sendTypingEvent', threadId, type]);
                return { status: 0 };
            },
            ...overrides,
        },
    };
}

async function withBridge(slotFactory, run) {
    const calls = [];
    const bridge = await startBridge({ slot: slotFactory ? slotFactory(calls) : null, calls });
    try {
        await run(bridge, calls);
    } finally {
        bridge.server.close();
    }
}

test('cửa ra mới: thiếu send secret → 403 cho cả ba route', async () => {
    await withBridge(readySlot, async (bridge) => {
        for (const routePath of ['/personal-messages/reaction', '/personal-messages/undo', '/personal-messages/typing']) {
            const res = await bridge.post(routePath, { connection_id: 6, thread_id: '1' }, 'sai-secret');
            assert.equal(res.status, 403, routePath);
        }
    });
});

test('reaction: gọi zca addReaction đúng mã + đích, trả source_id', async () => {
    await withBridge(readySlot, async (bridge, calls) => {
        const res = await bridge.post('/personal-messages/reaction', {
            connection_id: 6,
            thread_id: '9876543210',
            msg_id: '8233978780092',
            cli_msg_id: '1725600000000',
            icon: '👍',
        });
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { ok: true, source_id: '98765' });
        assert.deepEqual(calls[0], [
            'addReaction',
            '/-strong',
            {
                data: { msgId: '8233978780092', cliMsgId: '1725600000000' },
                threadId: '9876543210',
                type: ThreadType.User,
            },
        ]);
    });
});

test('reaction: thread_type=1 → ThreadType.Group; icon rỗng = gỡ cảm xúc', async () => {
    await withBridge(readySlot, async (bridge, calls) => {
        await bridge.post('/personal-messages/reaction', {
            connection_id: 6,
            thread_id: '7788',
            thread_type: 1,
            msg_id: '1',
            cli_msg_id: '2',
            icon: '',
        });
        assert.equal(calls[0][1], '');
        assert.equal(calls[0][2].type, ThreadType.Group);
    });
});

test('reaction: emoji Zalo không có → bad_request (KHÔNG được lọt xuống thành gỡ cảm xúc)', async () => {
    await withBridge(readySlot, async (bridge, calls) => {
        const res = await bridge.post('/personal-messages/reaction', {
            connection_id: 6,
            thread_id: '1',
            msg_id: '1',
            cli_msg_id: '2',
            icon: '🦄',
        });
        assert.equal(res.status, 400);
        assert.equal(res.body.code, 'bad_request');
        assert.equal(res.body.message, 'reaction_icon_unknown');
        assert.equal(calls.length, 0);
    });
});

test('undo: gọi zca undo (KHÔNG deleteMessage) với msgId/cliMsgId + thread', async () => {
    await withBridge(readySlot, async (bridge, calls) => {
        const res = await bridge.post('/personal-messages/undo', {
            connection_id: 6,
            thread_id: '9876543210',
            msg_id: '8233978780092',
            cli_msg_id: '1725600000000',
        });
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { ok: true });
        assert.deepEqual(calls[0], [
            'undo',
            { msgId: '8233978780092', cliMsgId: '1725600000000' },
            '9876543210',
            ThreadType.User,
        ]);
    });
});

test('typing: chỉ cần thread_id', async () => {
    await withBridge(readySlot, async (bridge, calls) => {
        const res = await bridge.post('/personal-messages/typing', { connection_id: 6, thread_id: '9876543210' });
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { ok: true });
        assert.deepEqual(calls[0], ['sendTypingEvent', '9876543210', ThreadType.User]);
    });
});

test('thiếu tham số → bad_request có cấu trúc', async () => {
    await withBridge(readySlot, async (bridge) => {
        const noConnection = await bridge.post('/personal-messages/typing', { thread_id: '1' });
        assert.equal(noConnection.status, 400);
        assert.deepEqual(noConnection.body, { ok: false, code: 'bad_request', message: 'connection_id required' });

        const noThread = await bridge.post('/personal-messages/typing', { connection_id: 6 });
        assert.equal(noThread.body.message, 'recipient_id_or_thread_id_required');

        const noMsgId = await bridge.post('/personal-messages/undo', { connection_id: 6, thread_id: '1' });
        assert.equal(noMsgId.status, 400);
        assert.equal(noMsgId.body.message, 'msg_id and cli_msg_id required');
    });
});

test('slot chưa login / mất phiên → session_lost kèm lý do, KHÔNG gọi Zalo', async () => {
    await withBridge(null, async (bridge) => {
        const res = await bridge.post('/personal-messages/typing', { connection_id: 6, thread_id: '1' });
        assert.equal(res.status, 503);
        assert.deepEqual(res.body, { ok: false, code: 'session_lost', message: 'not_logged_in' });
    });

    const lost = { loginPhase: 'session_lost', sessionLostReason: 'ws_closed_1006_', api: {} };
    const bridge = await startBridge({ slot: lost });
    try {
        const res = await bridge.post('/personal-messages/undo', {
            connection_id: 6,
            thread_id: '1',
            msg_id: '1',
            cli_msg_id: '2',
        });
        assert.equal(res.status, 503);
        assert.equal(res.body.code, 'session_lost');
        assert.equal(res.body.message, 'ws_closed_1006_');
    } finally {
        bridge.server.close();
    }
});

test('Zalo từ chối → zalo_rejected (502); lỗi lạ → unknown (500)', async () => {
    const zaloError = Object.assign(new Error('Message not found'), { name: 'ZcaApiError', code: 216 });
    await withBridge(
        (calls) =>
            readySlot(calls, {
                async undo() {
                    throw zaloError;
                },
                async sendTypingEvent() {
                    throw new TypeError('api.sendTypingEvent is not a function');
                },
            }),
        async (bridge) => {
            const rejected = await bridge.post('/personal-messages/undo', {
                connection_id: 6,
                thread_id: '1',
                msg_id: '1',
                cli_msg_id: '2',
            });
            assert.equal(rejected.status, 502);
            assert.deepEqual(rejected.body, { ok: false, code: 'zalo_rejected', message: 'Message not found' });

            const unknown = await bridge.post('/personal-messages/typing', { connection_id: 6, thread_id: '1' });
            assert.equal(unknown.status, 500);
            assert.equal(unknown.body.code, 'unknown');
        }
    );
});

test('classifyZcaError / firstSourceId', () => {
    assert.equal(classifyZcaError(Object.assign(new Error('x'), { name: 'ZcaApiError' })), 'zalo_rejected');
    assert.equal(classifyZcaError(Object.assign(new Error('x'), { name: 'ZaloApiError' })), 'zalo_rejected');
    assert.equal(classifyZcaError(new TypeError('x')), 'unknown');
    assert.equal(firstSourceId({ msgIds: [1, 2] }), '1');
    assert.equal(firstSourceId({ msgId: 7 }), '7');
    assert.equal(firstSourceId({ status: 0 }), null);
    assert.equal(firstSourceId(null), null);
});

test('/personal-messages/send: chuyển tiếp filename + content_type xuống lớp gửi (lô 3)', async () => {
    const sent = [];
    const app = express();
    app.use(express.json());
    registerPersonalMessageRoutes(app, {
        checkSendSecret: () => true,
        getSlot: () => ({ api: {} }),
        resolveSlot: () => ({ api: {} }),
        bridgeSendTextOrMedia: async (_slot, body) => {
            sent.push(body);
            return { source_id: 'm1', source_ids: ['m1'] };
        },
        ThreadType,
        zcaReactionCode,
    });
    const server = app.listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    try {
        const { port } = server.address();
        const res = await fetch(`http://127.0.0.1:${port}/personal-messages/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                connection_id: 6,
                thread_id: '9876543210',
                file_url: 'http://127.0.0.1:8000/storage/x',
                media_kind: 'file',
                filename: 'Báo giá Q4.pdf',
                content_type: 'application/pdf',
            }),
        });
        assert.equal(res.status, 200);
        assert.equal(sent[0].filename, 'Báo giá Q4.pdf');
        assert.equal(sent[0].content_type, 'application/pdf');
    } finally {
        server.close();
    }
});

test('/personal-messages/send: chuyển nguyên mentions xuống lớp gửi', async () => {
    const sent = [];
    const app = express();
    app.use(express.json());
    registerPersonalMessageRoutes(app, {
        checkSendSecret: () => true,
        getSlot: () => ({ api: {} }),
        resolveSlot: () => ({ api: {} }),
        bridgeSendTextOrMedia: async (_slot, body) => {
            sent.push(body);
            return { source_id: 'm2', source_ids: ['m2'] };
        },
        ThreadType,
        zcaReactionCode,
    });
    const server = app.listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    try {
        const { port } = server.address();
        const mentions = [{ uid: '555', pos: 0, len: 5 }];
        const res = await fetch(`http://127.0.0.1:${port}/personal-messages/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ connection_id: 6, thread_id: 'g1', thread_type: 1, text: '@Bình xem giúp', mentions }),
        });
        assert.equal(res.status, 200);
        assert.deepEqual(sent[0].mentions, mentions);
        assert.equal(sent[0].thread_type, 1);
    } finally {
        server.close();
    }
});

test('tham số sai được báo TRƯỚC trạng thái phiên (không che lỗi caller thành session_lost)', async () => {
    await withBridge(null, async (bridge) => {
        const badIcon = await bridge.post('/personal-messages/reaction', {
            connection_id: 6,
            thread_id: '1',
            msg_id: '1',
            cli_msg_id: '2',
            icon: '🦄',
        });
        assert.equal(badIcon.status, 400);
        assert.equal(badIcon.body.code, 'bad_request');

        const noRef = await bridge.post('/personal-messages/undo', { connection_id: 6, thread_id: '1' });
        assert.equal(noRef.status, 400);
        assert.equal(noRef.body.message, 'msg_id and cli_msg_id required');
    });
});

// ── Danh mục sticker ────────────────────────────────────────────────────────

const STICKER_ROUTES = [
    '/personal-messages/stickers/search',
    '/personal-messages/stickers/detail',
    '/personal-messages/stickers/category',
];

function stickerDetail(id, cateId = 61900) {
    return { id, cateId, type: 7, stickerUrl: `https://cdn.zalo.test/${id}.webp`, text: `[^${cateId}.${id}^]` };
}

function stickerSlot(calls, overrides = {}) {
    return readySlot(calls, {
        async searchSticker(keyword, limit) {
            calls.push(['searchSticker', keyword, limit]);
            return [{ type: 7, cate_id: 61900, sticker_id: 98930 }];
        },
        async getStickers(keyword) {
            calls.push(['getStickers', keyword]);
            return Array.from({ length: 15 }, (_, i) => 1000 + i);
        },
        async getStickersDetail(ids) {
            calls.push(['getStickersDetail', ids]);
            return ids.map((id) => stickerDetail(id));
        },
        async getStickerCategoryDetail(cateId) {
            calls.push(['getStickerCategoryDetail', cateId]);
            return [stickerDetail(98930, cateId), stickerDetail(98931, cateId)];
        },
        ...overrides,
    });
}

test('sticker: thiếu send secret → 403 cho cả ba route', async () => {
    await withBridge(stickerSlot, async (bridge, calls) => {
        for (const routePath of STICKER_ROUTES) {
            const res = await bridge.post(routePath, { connection_id: 6, keyword: 'chào', ids: [1], cate_id: 1 }, 'sai');
            assert.equal(res.status, 403, routePath);
        }
        assert.equal(calls.length, 0);
    });
});

test('sticker/search: gọi searchSticker(keyword, 30) và trả mục đủ bộ ba để gửi', async () => {
    await withBridge(stickerSlot, async (bridge, calls) => {
        const res = await bridge.post('/personal-messages/stickers/search', { connection_id: 6, keyword: ' cảm ơn ' });

        assert.equal(res.status, 200);
        assert.deepEqual(res.body, {
            ok: true,
            stickers: [
                {
                    id: 98930,
                    cate_id: 61900,
                    type: 7,
                    url: 'https://zalo-api.zadn.vn/api/emoticon/sticker/webpc?eid=98930&size=130',
                    label: null,
                },
            ],
        });
        assert.deepEqual(calls, [['searchSticker', 'cảm ơn', 30]]);
    });
});

test('sticker/search: searchSticker rỗng hoặc ném lỗi → gợi ý + tra chi tiết tối đa 12 mã', async () => {
    for (const searchSticker of [
        async () => [],
        async () => {
            throw Object.assign(new Error('not found'), { name: 'ZaloApiError' });
        },
    ]) {
        await withBridge(
            (calls) => stickerSlot(calls, { searchSticker }),
            async (bridge, calls) => {
                const res = await bridge.post('/personal-messages/stickers/search', { connection_id: 6, keyword: 'haha' });

                assert.equal(res.status, 200);
                assert.equal(res.body.stickers.length, 12);
                assert.equal(res.body.stickers[0].url, 'https://cdn.zalo.test/1000.webp');
                const detail = calls.find((call) => call[0] === 'getStickersDetail');
                assert.deepEqual(detail[1], Array.from({ length: 12 }, (_, i) => 1000 + i));
            }
        );
    }
});

test('sticker/search: từ khoá rỗng hoặc dài quá 50 ký tự → bad_request TRƯỚC khi kiểm phiên', async () => {
    await withBridge(null, async (bridge) => {
        for (const keyword of ['', '   ', 'a'.repeat(51)]) {
            const res = await bridge.post('/personal-messages/stickers/search', { connection_id: 6, keyword });
            assert.equal(res.status, 400);
            assert.equal(res.body.code, 'bad_request');
        }
    });
});

test('sticker/detail: nhận mã hợp lệ; quá 20 mã hoặc mã không phải số → bad_request', async () => {
    await withBridge(stickerSlot, async (bridge, calls) => {
        const ok = await bridge.post('/personal-messages/stickers/detail', { connection_id: 6, ids: [98930] });
        assert.equal(ok.status, 200);
        assert.equal(ok.body.stickers[0].id, 98930);
        assert.equal(ok.body.stickers[0].cate_id, 61900);
        assert.deepEqual(calls[0], ['getStickersDetail', [98930]]);

        const tooMany = await bridge.post('/personal-messages/stickers/detail', {
            connection_id: 6,
            ids: Array.from({ length: 21 }, (_, i) => i + 1),
        });
        assert.equal(tooMany.body.code, 'bad_request');

        const notNumber = await bridge.post('/personal-messages/stickers/detail', { connection_id: 6, ids: ['abc'] });
        assert.equal(notNumber.body.code, 'bad_request');
        assert.equal(calls.length, 1);
    });
});

test('sticker/category: gọi getStickerCategoryDetail với mã bộ', async () => {
    await withBridge(stickerSlot, async (bridge, calls) => {
        const res = await bridge.post('/personal-messages/stickers/category', { connection_id: 6, cate_id: '61900' });

        assert.equal(res.status, 200);
        assert.deepEqual(
            res.body.stickers.map((sticker) => sticker.id),
            [98930, 98931]
        );
        assert.deepEqual(calls, [['getStickerCategoryDetail', 61900]]);
    });
});

test('sticker: slot chưa sẵn sàng → session_lost, KHÔNG gọi zca', async () => {
    const calls = [];
    const lost = { ...stickerSlot(calls), loginPhase: 'session_lost', sessionLostReason: 'ws_closed_1006_' };
    const bridge = await startBridge({ slot: lost, calls });
    try {
        const res = await bridge.post('/personal-messages/stickers/search', { connection_id: 6, keyword: 'chào' });
        assert.equal(res.status, 503);
        assert.equal(res.body.code, 'session_lost');
        assert.equal(calls.length, 0);
    } finally {
        bridge.server.close();
    }
});

test('sticker: Zalo từ chối → zalo_rejected (502)', async () => {
    const rejected = Object.assign(new Error('Invalid category'), { name: 'ZcaApiError' });
    await withBridge(
        (calls) =>
            stickerSlot(calls, {
                async getStickerCategoryDetail() {
                    throw rejected;
                },
            }),
        async (bridge) => {
            const res = await bridge.post('/personal-messages/stickers/category', { connection_id: 6, cate_id: 1 });
            assert.equal(res.status, 502);
            assert.deepEqual(res.body, { ok: false, code: 'zalo_rejected', message: 'Invalid category' });
        }
    );
});
