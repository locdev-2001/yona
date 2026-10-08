import { describe, expect, it } from 'vitest';

import { avatarSeed, resolveAvatarIdentity, senderAvatarSeed } from './avatarSeed';

describe('avatarSeed', () => {
    it('ghép loại chủ thể với id bền', () => {
        expect(avatarSeed('contact', 12)).toBe('contact:12');
        expect(avatarSeed('group_member', '84901')).toBe('group_member:84901');
    });

    it.each([null, undefined, ''])('không có id (%s) thì không có seed', id => {
        expect(avatarSeed('user', id)).toBeUndefined();
    });
});

describe('senderAvatarSeed', () => {
    it.each([
        [{ id: 3, type: 'user' }, 'user:3'],
        [{ id: 3, type: 'User' }, 'user:3'],
        [{ id: 5, type: 'contact' }, 'contact:5'],
        [{ id: 7, type: 'agent_bot' }, 'agent_bot:7'],
        [{ id: 7, type: 'AgentBot' }, 'agent_bot:7'],
    ])('người gửi %o dùng chung seed với chủ thể của nó', (sender, expected) => {
        expect(senderAvatarSeed(sender)).toBe(expected);
    });

    it.each([[{ id: 9, type: 'captain_assistant' }], [{ id: 9 }], [null], [undefined]])(
        'loại người gửi lạ hoặc thiếu (%o) thì không có seed',
        sender => {
            expect(senderAvatarSeed(sender)).toBeUndefined();
        },
    );
});

describe('resolveAvatarIdentity', () => {
    it('ưu tiên seed, thiếu seed mới theo tên đã cắt khoảng trắng', () => {
        expect(resolveAvatarIdentity('user:1', 'Lan')).toBe('user:1');
        expect(resolveAvatarIdentity(undefined, '  Lan ')).toBe('Lan');
        expect(resolveAvatarIdentity(undefined, null)).toBe('');
    });
});
