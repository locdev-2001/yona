import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { ThreadType } from 'zca-js';
import { registerUiActionsRoutes } from './ui-actions.mjs';

/** Slot giả của một nhóm hai người: một người thiếu avatar để lượt tra hồ sơ có việc làm. */
function groupSlot(calls) {
    return {
        api: {
            async getGroupInfo(groupId) {
                calls.push(['getGroupInfo', groupId]);
                return { gridInfoMap: { [groupId]: { creatorId: '101', adminIds: [], memberIds: ['101', '202'] } } };
            },
            async getGroupMembersInfo(ids) {
                calls.push(['getGroupMembersInfo', ids]);
                return {
                    profiles: {
                        101: { id: '101', displayName: 'An', avatar: 'https://cdn.zalo.test/an.jpg' },
                        202: { id: '202', displayName: 'Bình', avatar: '' },
                    },
                };
            },
            async getUserInfo(id) {
                calls.push(['getUserInfo', id]);
                return { changed_profiles: { [id]: { userId: id, displayName: 'Bình', avatar: 'https://cdn.zalo.test/binh.jpg' } } };
            },
        },
    };
}

async function withGroupMembersRoute(calls, run) {
    const app = express();
    registerUiActionsRoutes(app, {
        checkUiSecret: () => true,
        getSlot: () => groupSlot(calls),
        ThreadType,
        buildGroupBackfillPayload: () => null,
        enqueueOutbox: () => undefined,
    });
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    try {
        const { port } = server.address();
        await run((query) => fetch(`http://127.0.0.1:${port}/ui/group-members?${query}`).then((res) => res.json()));
    } finally {
        server.close();
    }
}

test('/ui/group-members?lite=1 không tra hồ sơ từng người, vẫn trả tên trong danh sách nhóm', async () => {
    const calls = [];
    await withGroupMembersRoute(calls, async (get) => {
        const body = await get('connection_id=6&group_id=g1&lite=1');

        assert.equal(body.ok, true);
        assert.deepEqual(
            body.members.map(({ id, name, role }) => ({ id, name, role })),
            [
                { id: '101', name: 'An', role: 'owner' },
                { id: '202', name: 'Bình', role: 'member' },
            ],
        );
        assert.equal(calls.filter(([method]) => method === 'getUserInfo').length, 0);
    });
});

test('/ui/group-members không có lite thì vẫn tra hồ sơ người thiếu avatar như cũ', async () => {
    const calls = [];
    await withGroupMembersRoute(calls, async (get) => {
        const body = await get('connection_id=6&group_id=g1');

        assert.deepEqual(
            calls.filter(([method]) => method === 'getUserInfo'),
            [['getUserInfo', '202']],
        );
        assert.equal(body.members.find((member) => member.id === '202').avatar, 'https://cdn.zalo.test/binh.jpg');
    });
});
