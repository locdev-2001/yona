import { describe, expect, it } from 'vitest';

import { updateSelectionIndex } from './useKeyboardNavigableList';

describe('updateSelectionIndex', () => {
    it('xuống một bậc', () => {
        expect(updateSelectionIndex(0, 3, 'down')).toBe(1);
    });

    it('xuống từ phần tử cuối thì quay về đầu', () => {
        expect(updateSelectionIndex(2, 3, 'down')).toBe(0);
    });

    it('lên một bậc', () => {
        expect(updateSelectionIndex(2, 3, 'up')).toBe(1);
    });

    it('lên từ phần tử đầu thì nhảy xuống cuối', () => {
        expect(updateSelectionIndex(0, 3, 'up')).toBe(2);
    });

    it('danh sách một phần tử luôn giữ nguyên chỉ số', () => {
        expect(updateSelectionIndex(0, 1, 'up')).toBe(0);
        expect(updateSelectionIndex(0, 1, 'down')).toBe(0);
    });
});
