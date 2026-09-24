import { describe, expect, it } from 'vitest';

import { canStep, matchCounterLabel, matchRangesIn, stepMatchIndex } from './conversationSearch';

describe('conversation search navigation', () => {
    it('moves to older matches with ↑ and newer with ↓, stopping at both ends', () => {
        expect(stepMatchIndex(0, 3, 'older')).toBe(1);
        expect(stepMatchIndex(2, 3, 'older')).toBe(2);
        expect(stepMatchIndex(1, 3, 'newer')).toBe(0);
        expect(stepMatchIndex(0, 3, 'newer')).toBe(0);
        expect(stepMatchIndex(-1, 0, 'older')).toBe(-1);
    });

    it('tells whether a step is possible', () => {
        expect(canStep(0, 3, 'older')).toBe(true);
        expect(canStep(0, 3, 'newer')).toBe(false);
        expect(canStep(2, 3, 'older')).toBe(false);
        expect(canStep(-1, 0, 'older')).toBe(false);
    });

    it('counts the position from the newest match', () => {
        expect(matchCounterLabel(2, 12)).toBe('3/12');
        expect(matchCounterLabel(-1, 0)).toBe('0/0');
    });
});

describe('matchRangesIn', () => {
    it('finds accent-insensitive matches across the text nodes of a message', () => {
        const root = document.createElement('p');
        root.innerHTML = 'Gửi <strong>số tài khoản</strong> giúp em, so tai khoan cũ';

        const matched = matchRangesIn(root, 'so tai khoan').map(range => range.toString());

        expect(matched).toEqual(['số tài khoản', 'so tai khoan']);
    });
});
