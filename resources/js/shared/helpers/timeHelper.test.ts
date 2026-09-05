import { describe, expect, it } from 'vitest';

import { formatDuration } from './timeHelper';

describe('formatDuration', () => {
    it('định dạng mm:ss và hh:mm:ss', () => {
        expect(formatDuration(65)).toBe('01:05');
        expect(formatDuration(3661)).toBe('01:01:01');
    });

    it('trả chuỗi rỗng cho giá trị âm hoặc thiếu', () => {
        expect(formatDuration(-1)).toBe('');
        expect(formatDuration(null)).toBe('');
        expect(formatDuration(undefined)).toBe('');
        expect(formatDuration('abc')).toBe('');
    });
});
