import { describe, expect, it } from 'vitest';

import { autoGrowOverflow, fitAutoGrowHeight } from './autoGrowField';

describe('ô soạn tự giãn', () => {
    it('nội dung chưa chạm trần: cao đúng nội dung, không cho cuộn', () => {
        expect(fitAutoGrowHeight(36, 120)).toStrictEqual({ height: 36, overflowY: 'hidden' });
        expect(fitAutoGrowHeight(120, 120)).toStrictEqual({ height: 120, overflowY: 'hidden' });
    });

    it('vượt trần: ghim ở trần và mở cuộn', () => {
        expect(fitAutoGrowHeight(180, 120)).toStrictEqual({ height: 120, overflowY: 'auto' });
    });

    it('lệch dưới 1px do làm tròn không tính là tràn', () => {
        expect(autoGrowOverflow(40.6, 40)).toBe('hidden');
        expect(autoGrowOverflow(43, 32)).toBe('auto');
    });
});
