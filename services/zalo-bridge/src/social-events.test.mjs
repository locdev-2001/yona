import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    buildFriendRequestPayload,
    friendRequestFromEvent,
    zaloPersonalSocialSourceId,
} from './social-events.mjs';

const incomingRequest = {
    type: 2, // FriendEventType.REQUEST
    threadId: '614700000000000000', // toUid = tài khoản bridge
    isSelf: false,
    data: { toUid: '614700000000000000', fromUid: '555000111', src: 1, message: 'Chào shop, cho mình hỏi giá' },
};

test('lời mời kết bạn ĐẾN: người mời ở fromUid, giữ lời nhắn', () => {
    assert.deepEqual(friendRequestFromEvent(incomingRequest), {
        uid: '555000111',
        message: 'Chào shop, cho mình hỏi giá',
    });
});

test('lời mời MÌNH gửi đi (isSelf) và loại event khác đều bị bỏ qua', () => {
    assert.equal(friendRequestFromEvent({ ...incomingRequest, isSelf: true }), null);
    assert.equal(friendRequestFromEvent({ ...incomingRequest, type: 0 }), null);
    assert.equal(friendRequestFromEvent({ type: 2, isSelf: false, data: { toUid: 'x' } }), null);
    assert.equal(friendRequestFromEvent(null), null);
});

test('lời mời không kèm lời nhắn → payload không có khoá message', () => {
    const request = friendRequestFromEvent({
        ...incomingRequest,
        data: { ...incomingRequest.data, message: '' },
    });
    assert.deepEqual(request, { uid: '555000111' });
    const payload = buildFriendRequestPayload({
        connectionId: 6,
        botId: 6,
        personalUid: '614700000000000000',
        request,
    });
    assert.equal('message' in payload, false);
    assert.deepEqual(payload.user, { uid: '555000111', name: '555000111', avatar: null });
});

test('payload friend_request: đủ trường định tuyến + hồ sơ người mời', () => {
    const payload = buildFriendRequestPayload({
        connectionId: 6,
        botId: 6,
        personalUid: '614700000000000000',
        request: friendRequestFromEvent(incomingRequest),
        profile: { name: 'Minh Anh', avatar: 'https://cdn.test/u.jpg' },
    });
    assert.equal(payload.type, 'friend_request');
    assert.equal(payload.connection_id, 6);
    assert.equal(payload.bot_id, 6);
    assert.equal(payload.personal_uid, '614700000000000000');
    assert.deepEqual(payload.user, { uid: '555000111', name: 'Minh Anh', avatar: 'https://cdn.test/u.jpg' });
    assert.equal(payload.message, 'Chào shop, cho mình hỏi giá');
    assert.match(payload.source_id, /^zps:614700000000000000:[0-9a-f]{48}$/);
});

test('source_id idempotent: Zalo bắn lại cùng lời mời sau reconnect vẫn ra một khoá', () => {
    const first = buildFriendRequestPayload({
        connectionId: 6,
        botId: 6,
        personalUid: '614700000000000000',
        request: friendRequestFromEvent(incomingRequest),
    });
    // reconnect: connection_id đổi, hồ sơ resolve được thêm — khoá KHÔNG được đổi.
    const second = buildFriendRequestPayload({
        connectionId: 9,
        botId: 6,
        personalUid: '614700000000000000',
        request: friendRequestFromEvent(JSON.parse(JSON.stringify(incomingRequest))),
        profile: { name: 'Minh Anh', avatar: 'https://cdn.test/u.jpg' },
    });
    assert.equal(first.source_id, second.source_id);

    const otherPerson = buildFriendRequestPayload({
        connectionId: 6,
        botId: 6,
        personalUid: '614700000000000000',
        request: { uid: '555000222', message: 'Chào shop, cho mình hỏi giá' },
    });
    assert.notEqual(first.source_id, otherPerson.source_id);
});

test('zaloPersonalSocialSourceId: thứ tự khoá trong event không làm đổi khoá', () => {
    const a = zaloPersonalSocialSourceId('uid', 'friend_request', '', 't', { b: 2, a: 1 });
    const b = zaloPersonalSocialSourceId('uid', 'friend_request', '', 't', { a: 1, b: 2 });
    assert.equal(a, b);
});
