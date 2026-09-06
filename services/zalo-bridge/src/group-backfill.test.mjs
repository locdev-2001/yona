import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGroupBackfillPayload } from './index.mjs';

/**
 * Lane backfill (old_messages / resync sau reconnect) không có cửa HTTP để thử,
 * mà đúng nó là chỗ từng lệch với lane live (bẫy 1.10). Khoá hình dạng tin nhóm
 * ở đây để hai lane không thể tách nhau nữa.
 */
function groupSlot({ groupProfile = null } = {}) {
    const slot = { _connectionId: 6, botId: 6, personalUid: '614700000000000000' };
    if (groupProfile) {
        slot.groupNameById = { 7788: { profile: groupProfile, at: Date.now() } };
    }
    return slot;
}

const groupText = {
    msgId: '8233978780092',
    cliMsgId: '1725600000000',
    msgType: 'chat.text',
    uidFrom: '555000111',
    dName: 'Minh Anh',
    ts: '1725600000000',
    content: '@Bình xem giúp đơn này nhé',
    mentions: [{ uid: '555000222', pos: 0, len: 5, type: 0 }],
};

test('backfill nhóm: có thread + sender + mentions như lane live', () => {
    const payload = buildGroupBackfillPayload(
        groupSlot({ groupProfile: { name: 'Nhóm Bán Hàng', avatar: 'https://cdn.test/g.jpg' } }),
        '7788',
        groupText,
        false,
        1
    );
    assert.deepEqual(payload.thread, {
        type: 'group',
        id: '7788',
        name: 'Nhóm Bán Hàng',
        avatar: 'https://cdn.test/g.jpg',
    });
    assert.deepEqual(payload.sender, { external_id: '555000111', name: 'Minh Anh' });
    assert.equal(payload.sender_uid, '555000111');
    assert.deepEqual(payload.mentions, [{ external_id: '555000222', name: 'Bình', offset: 0, length: 5 }]);
    assert.equal(payload.thread_type, 1);
});

test('backfill nhóm: tin của chính tài khoản bridge CŨNG mang người gửi', () => {
    const payload = buildGroupBackfillPayload(
        groupSlot(),
        '7788',
        { ...groupText, uidFrom: '614700000000000000', dName: 'Shop Yona' },
        true,
        1
    );
    assert.deepEqual(payload.sender, { external_id: '614700000000000000', name: 'Shop Yona' });
    assert.equal(payload.direction, 'out');
});

test('backfill nhóm: chưa có cache tên nhóm → rơi về id nhóm, không bỏ trống thread', () => {
    const payload = buildGroupBackfillPayload(groupSlot(), '7788', groupText, false, 1);
    assert.deepEqual(payload.thread, { type: 'group', id: '7788', name: '7788' });
});

test('backfill 1-1 (threadType=0): KHÔNG gắn thread/sender nhóm', () => {
    const payload = buildGroupBackfillPayload(groupSlot(), '9876543210', groupText, false, 0);
    assert.equal(payload.thread, undefined);
    assert.equal(payload.sender, undefined);
    assert.equal(payload.sender_uid, '555000111');
});

test('backfill: tin vị trí chat.location.new ra inbound_kind location (lane backfill cũng phải thấy)', () => {
    const payload = buildGroupBackfillPayload(
        groupSlot(),
        '9876543210',
        {
            msgId: '1',
            cliMsgId: '2',
            msgType: 'chat.location.new',
            uidFrom: '555000111',
            ts: '1725600000000',
            content: {
                title: null,
                description: 'Số 1 Đường Giả Định, Quận 1, TP.HCM',
                href: null,
                params: '{"isUserLocation":1,"srcId":"0","latitude":10.111111,"longitude":106.222222}',
            },
        },
        false,
        0
    );
    assert.equal(payload.inbound_kind, 'location');
    assert.deepEqual(payload.location, {
        latitude: 10.111111,
        longitude: 106.222222,
        address: 'Số 1 Đường Giả Định, Quận 1, TP.HCM',
        url: 'https://maps.google.com/?q=10.111111,106.222222',
    });
});
