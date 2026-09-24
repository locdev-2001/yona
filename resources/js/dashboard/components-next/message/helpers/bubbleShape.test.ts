import { describe, expect, it } from 'vitest';

import { bubbleCornerClass } from './bubbleShape';

describe('bo góc bong bóng theo vị trí trong nhóm', () => {
    it('tin đứng một mình bo tròn đều, không góc nhỏ', () => {
        expect(bubbleCornerClass('left', 'single')).toBe('rounded-2xl');
        expect(bubbleCornerClass('right', 'single')).toBe('rounded-2xl');
    });

    it('bên khách (trái): góc nhỏ ở cạnh trái nối với tin liền kề', () => {
        expect(bubbleCornerClass('left', 'first')).toContain('ltr:rounded-bl-md');
        expect(bubbleCornerClass('left', 'middle')).toContain('ltr:rounded-l-md');
        expect(bubbleCornerClass('left', 'last')).toContain('ltr:rounded-tl-md');
    });

    it('bên mình (phải): góc nhỏ ở cạnh phải', () => {
        expect(bubbleCornerClass('right', 'first')).toContain('ltr:rounded-br-md');
        expect(bubbleCornerClass('right', 'middle')).toContain('ltr:rounded-r-md');
        expect(bubbleCornerClass('right', 'last')).toContain('ltr:rounded-tr-md');
        expect(bubbleCornerClass('right', 'last')).not.toContain('ltr:rounded-tl-md');
    });
});
