import { describe, expect, it } from 'vitest';

import { isJumboEmoji } from './jumboEmoji';

describe('tin chỉ có emoji', () => {
    it.each(['👍', '❤️', '😂🔥❤️', ' 👍🏽 ', '🇻🇳', '👨‍👩‍👧', '😆 😆'])('"%s" hiện cỡ lớn', content => {
        expect(isJumboEmoji(content)).toBe(true);
    });

    it.each(['👍👍👍👍', 'ok 👍', 'hi', '1', '#', '', null, undefined])('"%s" giữ bong bóng thường', content => {
        expect(isJumboEmoji(content)).toBe(false);
    });
});
