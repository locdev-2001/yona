import { describe, expect, it } from 'vitest';

import type { Macro } from 'dashboard/settings/macros/types';
import { macrosOrderPatch, orderMacros } from './useOrderedMacros';

// Port từ composables/spec/useOrderedMacros.spec.js — computed get/set của gốc
// thành hai hàm thuần (uiSettings đến từ ConversationContext).
const macro = (id: number, name: string) => ({ id, name }) as Macro;
const macros = [macro(1, 'Resolve'), macro(2, 'Mark as spam'), macro(3, 'Remove team')];

const settings = (savedOrder: number[] | null) => (savedOrder ? { macros_display_order: savedOrder } : {});

describe('orderMacros', () => {
    it('keeps the store order when nothing has been arranged', () => {
        expect(orderMacros(macros, settings(null)).map(({ id }) => id)).toEqual([1, 2, 3]);
    });

    it('keeps the store order when the saved order is empty', () => {
        expect(orderMacros(macros, settings([])).map(({ id }) => id)).toEqual([1, 2, 3]);
    });

    it('sorts macros by the saved order', () => {
        expect(orderMacros(macros, settings([3, 1, 2])).map(({ id }) => id)).toEqual([3, 1, 2]);
    });

    it('pushes macros missing from the saved order to the end', () => {
        expect(orderMacros(macros, settings([3])).map(({ id }) => id)).toEqual([3, 1, 2]);
    });

    it('ignores saved ids that no longer exist', () => {
        expect(orderMacros([macros[0], macros[1]], settings([99, 2, 1])).map(({ id }) => id)).toEqual([2, 1]);
    });

    it('returns an empty list when there are no macros', () => {
        expect(orderMacros([], settings([3, 1, 2]))).toEqual([]);
    });
});

describe('macrosOrderPatch', () => {
    it('saves the new order as ids', () => {
        expect(macrosOrderPatch([macros[2], macros[0], macros[1]])).toEqual({ macros_display_order: [3, 1, 2] });
    });
});
