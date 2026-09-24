import { describe, expect, it } from 'vitest';

import {
    MESSAGE_GROUP_WINDOW_SECONDS,
    TIME_DIVIDER_GAP_SECONDS,
    belongsToSameGroup,
    needsTimeDivider,
    resolveGroupPositions,
} from './messageGrouping';

const T0 = 1758770000;
const from = (senderKey: string, createdAt: number, standalone = false) => ({ senderKey, createdAt, standalone });

describe('luật gộp nhóm tin liên tiếp', () => {
    it('cùng người gửi, cách nhau dưới khoảng gộp thì chung nhóm: đầu, giữa, cuối', () => {
        expect(resolveGroupPositions([from('a', T0), from('a', T0 + 30), from('a', T0 + 90)])).toEqual([
            'first',
            'middle',
            'last',
        ]);
    });

    it('đúng bằng khoảng gộp thì tách nhóm', () => {
        expect(belongsToSameGroup(from('a', T0), from('a', T0 + MESSAGE_GROUP_WINDOW_SECONDS - 1))).toBe(true);
        expect(belongsToSameGroup(from('a', T0), from('a', T0 + MESSAGE_GROUP_WINDOW_SECONDS))).toBe(false);
    });

    it('khác người gửi thì mỗi người một nhóm', () => {
        expect(resolveGroupPositions([from('a', T0), from('b', T0), from('b', T0 + 1), from('a', T0 + 2)])).toEqual([
            'single',
            'first',
            'last',
            'single',
        ]);
    });

    it('tin đứng riêng cắt nhóm ở cả hai phía', () => {
        expect(resolveGroupPositions([from('a', T0), from('a', T0 + 1, true), from('a', T0 + 2)])).toEqual([
            'single',
            'single',
            'single',
        ]);
    });

    it('danh sách rỗng hoặc một tin', () => {
        expect(resolveGroupPositions([])).toEqual([]);
        expect(resolveGroupPositions([from('a', T0)])).toEqual(['single']);
    });
});

describe('mốc thời gian giữa các nhóm', () => {
    it('tin đầu danh sách luôn có mốc', () => {
        expect(needsTimeDivider(null, T0)).toBe(true);
    });

    it('chỉ chèn mốc khi hai tin cách nhau đủ lâu', () => {
        expect(needsTimeDivider(T0, T0 + TIME_DIVIDER_GAP_SECONDS - 1)).toBe(false);
        expect(needsTimeDivider(T0, T0 + TIME_DIVIDER_GAP_SECONDS)).toBe(true);
    });
});
