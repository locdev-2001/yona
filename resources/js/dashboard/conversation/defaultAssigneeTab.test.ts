import { describe, expect, it } from 'vitest';
import { defaultAssigneeTab } from './defaultAssigneeTab';

describe('defaultAssigneeTab', () => {
    it.each([
        ['chưa lưu, một thành viên', undefined, 1, 'all'],
        ['chưa lưu, hai thành viên', undefined, 2, 'me'],
        ['chưa lưu, chưa biết số thành viên', undefined, undefined, 'all'],
        ['giá trị lưu rác, nhiều thành viên', 'mine', 5, 'me'],
        ['đã lưu Tất cả, nhiều thành viên', 'all', 5, 'all'],
        ['đã lưu Chưa gán, một thành viên', 'unassigned', 1, 'unassigned'],
    ])('%s', (_case, savedTab, memberCount, expected) => {
        expect(defaultAssigneeTab(savedTab, memberCount)).toBe(expected);
    });
});
