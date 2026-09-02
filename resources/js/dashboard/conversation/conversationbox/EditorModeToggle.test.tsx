import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { REPLY_EDITOR_MODES } from 'dashboard/components/widgets/WootWriter/constants';
import EditorModeToggle, { chipGeometry } from './EditorModeToggle';

// Chip trắng của EditorModeToggle.vue: width = contentRect nhãn + 16 (2×px-2),
// translate ở Private Note = contentRect nhãn Reply + 16. Đo sai bằng offsetWidth
// (đã gồm padding) làm chip rộng thừa 16px và lệch phải 16px — finding pixel-diff.
describe('chipGeometry', () => {
    it('adds label padding once to the active label width', () => {
        expect(chipGeometry(false, 37, 82)).toEqual({ width: '53px', translateX: '0px' });
        expect(chipGeometry(true, 37, 82)).toEqual({ width: '98px', translateX: '53px' });
    });
});

describe('EditorModeToggle chip', () => {
    // jsdom không layout: giả lập offsetWidth đã GỒM padding 8px mỗi bên.
    const OFFSET_WIDTHS: Record<string, number> = { Reply: 53, 'Private Note': 98 };

    beforeEach(() => {
        vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
            return OFFSET_WIDTHS[this.textContent ?? ''] ?? 0;
        });
        vi.spyOn(window, 'getComputedStyle').mockImplementation(
            () => ({ paddingLeft: '8px', paddingRight: '8px' }) as CSSStyleDeclaration,
        );
    });

    afterEach(() => vi.restoreAllMocks());

    it('hugs the Private Note label when in note mode', () => {
        const { getByTestId } = render(<EditorModeToggle mode={REPLY_EDITOR_MODES.NOTE} onToggleMode={() => undefined} />);
        const chip = getByTestId('editor-mode-chip');

        expect(chip.style.getPropertyValue('--chip-width')).toBe('98px');
        expect(chip.style.getPropertyValue('--translate-x')).toBe('53px');
    });

    it('hugs the Reply label when in reply mode', () => {
        const { getByTestId } = render(<EditorModeToggle mode={REPLY_EDITOR_MODES.REPLY} onToggleMode={() => undefined} />);
        const chip = getByTestId('editor-mode-chip');

        expect(chip.style.getPropertyValue('--chip-width')).toBe('53px');
        expect(chip.style.getPropertyValue('--translate-x')).toBe('0px');
    });
});
