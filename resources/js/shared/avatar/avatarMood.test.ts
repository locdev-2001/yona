import { mad, sad, scared, sick } from 'blobatar/expression';
import { describe, expect, it } from 'vitest';

import { avatarExpression } from './avatarMood';

describe('biểu cảm avatar hình khối', () => {
    it('cùng danh tính luôn ra cùng biểu cảm', () => {
        expect(avatarExpression('contact:12')).toBe(avatarExpression('contact:12'));
    });

    it('các danh tính khác nhau ra nhiều biểu cảm, không có mặt giận, buồn, sợ hay ốm', () => {
        const expressions = new Set(Array.from({ length: 200 }, (_, index) => avatarExpression(`contact:${index}`)));

        expect(expressions.size).toBeGreaterThan(4);
        for (const unfriendly of [mad, sad, scared, sick]) {
            expect(expressions.has(unfriendly)).toBe(false);
        }
    });
});
