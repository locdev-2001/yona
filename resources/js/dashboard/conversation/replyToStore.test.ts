import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getReplyTarget, removeReplyTarget, setReplyTarget } from './replyToStore';

describe('replyToStore', () => {
    beforeEach(() => window.localStorage.clear());
    afterEach(() => vi.restoreAllMocks());

    it('lưu, đọc và xoá theo từng hội thoại', () => {
        setReplyTarget(4, 120);
        setReplyTarget(5, 300);

        expect(getReplyTarget(4)).toBe(120);
        expect(getReplyTarget(5)).toBe(300);
        expect(getReplyTarget(6)).toBeNull();

        removeReplyTarget(4);

        expect(getReplyTarget(4)).toBeNull();
        expect(getReplyTarget(5)).toBe(300);
    });

    it('dữ liệu hỏng trong localStorage không ném lỗi', () => {
        window.localStorage.setItem('messageReplyTo', '{hỏng');
        expect(getReplyTarget(4)).toBeNull();

        window.localStorage.setItem('messageReplyTo', JSON.stringify({ 4: 'abc' }));
        expect(getReplyTarget(4)).toBeNull();

        setReplyTarget(4, 7);
        expect(getReplyTarget(4)).toBe(7);
    });

    it('localStorage bị chặn không ném lỗi', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });

        expect(() => setReplyTarget(4, 7)).not.toThrow();
        expect(getReplyTarget(4)).toBeNull();
        expect(() => removeReplyTarget(4)).not.toThrow();
    });
});
