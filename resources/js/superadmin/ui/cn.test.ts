import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
    it('bỏ giá trị rỗng', () => {
        expect(cn('a', false, null, undefined, 'b')).toBe('a b');
    });

    it('utility truyền sau đè utility cùng nhóm', () => {
        expect(cn('flex flex-col gap-5 py-5 px-2', 'flex-row gap-0 py-0')).toBe('flex px-2 flex-row gap-0 py-0');
        expect(cn('border border-transparent', 'border-console-border')).toBe('border border-console-border');
        expect(cn('text-sm text-console-foreground', 'text-xs')).toBe('text-console-foreground text-xs');
        expect(cn('inline-flex', 'hidden md:inline-flex')).toBe('hidden md:inline-flex');
    });

    it('khác biến thể hoặc khác cạnh thì giữ cả hai', () => {
        expect(cn('px-2 sm:px-4', 'pl-8')).toBe('px-2 sm:px-4 pl-8');
        expect(cn('border-b', 'border-console-border')).toBe('border-b border-console-border');
    });
});
