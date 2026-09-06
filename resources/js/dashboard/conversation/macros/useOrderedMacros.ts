import type { UISettings } from 'dashboard/composables/useUISettings';
import type { Macro } from 'dashboard/settings/macros/types';

// Port từ composables/useOrderedMacros.js — thứ tự agent tự sắp trong sidebar,
// mọi bề mặt liệt kê macro (accordion, command bar) đọc chung một thứ tự.
export const MACROS_ORDER_KEY = 'macros_display_order';

export function orderMacros(macros: Macro[] | null | undefined, uiSettings: UISettings): Macro[] {
    const savedOrder = (uiSettings?.[MACROS_ORDER_KEY] as number[] | undefined) ?? [];
    const currentMacros = macros ?? [];

    if (!savedOrder.length || !currentMacros.length) return currentMacros;

    const orderMap = new Map(savedOrder.map((id, index) => [id, index]));

    // Macro chưa từng được sắp giữ nguyên thứ tự của store, nằm ở cuối.
    return [...currentMacros].sort(
        (first, second) => (orderMap.get(first.id) ?? Infinity) - (orderMap.get(second.id) ?? Infinity),
    );
}

export function macrosOrderPatch(newOrder: Macro[]): UISettings {
    return { [MACROS_ORDER_KEY]: newOrder.map(({ id }) => id) };
}
