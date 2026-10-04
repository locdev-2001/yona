import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Macro } from 'dashboard/settings/macros/types';
import { clearCommandBarActions, getCommandBarActions, setCommandBarActions } from './commandBarStore';
import { useMacroHotKeys } from './useMacroHotKeys';

const { hookState, fetchMacros, runMacro } = vi.hoisted(() => ({
    hookState: {
        featureVisible: false,
        accountMacrosEnabled: true,
        conversationId: 42,
    },
    fetchMacros: vi.fn(),
    runMacro: vi.fn(),
}));

const savedMacro: Macro = {
    id: 7,
    account_id: 2,
    name: 'Gắn nhãn khách mới',
    visibility: 'global',
    actions: [{ action_name: 'add_label', action_params: ['Khách mới'] }],
};

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 2, features: { macros: hookState.accountMacrosEnabled } } } }),
}));
vi.mock('shared/helpers/productVisibility', () => ({
    isProductFeatureVisible: (feature: string) => feature === 'macros' && hookState.featureVisible,
}));
vi.mock('dashboard/conversation/ConversationContext', () => ({
    useConversation: () => ({ selectedConversation: { id: hookState.conversationId }, uiSettings: {} }),
}));
vi.mock('dashboard/settings/macros/macrosStore', () => ({
    fetchMacros,
    useMacrosSnapshot: () => ({ records: [savedMacro] }),
}));
vi.mock('dashboard/conversation/macros/useMacroExecution', () => ({ runMacro }));

beforeEach(() => {
    hookState.featureVisible = false;
    hookState.accountMacrosEnabled = true;
    hookState.conversationId = 42;
    fetchMacros.mockClear();
    runMacro.mockClear();
    clearCommandBarActions('macros');
});

afterEach(() => {
    clearCommandBarActions('macros');
    clearCommandBarActions('goto');
});

describe('macro trong bảng lệnh', () => {
    it('chế độ tinh gọn không tải hoặc đăng ký macro dù workspace có macro đã lưu', () => {
        renderHook(() => useMacroHotKeys());

        expect(fetchMacros).not.toHaveBeenCalled();
        expect(getCommandBarActions()).toEqual([]);
    });

    it('mở lại macro vẫn tải và thực thi đúng hội thoại', () => {
        hookState.featureVisible = true;
        renderHook(() => useMacroHotKeys());

        expect(fetchMacros).toHaveBeenCalledWith(2);
        expect(getCommandBarActions().map(action => action.id)).toEqual(['execute_a_macro', 'macro-7']);
        getCommandBarActions().find(action => action.id === 'macro-7')?.handler?.();
        expect(runMacro).toHaveBeenCalledWith(2, savedMacro, 42);
    });

    it('ẩn lại xoá lệnh macro đã đăng ký, giữ các lệnh khác và có thể mở lại', () => {
        hookState.featureVisible = true;
        setCommandBarActions('goto', [{ id: 'goto_contacts', title: 'Khách hàng', section: 'Đi tới' }]);
        const { rerender } = renderHook(() => useMacroHotKeys());

        hookState.featureVisible = false;
        rerender();
        expect(getCommandBarActions().map(action => action.id)).toEqual(['goto_contacts']);

        hookState.featureVisible = true;
        rerender();
        expect(getCommandBarActions().map(action => action.id)).toEqual(['goto_contacts', 'execute_a_macro', 'macro-7']);
        expect(fetchMacros).toHaveBeenCalledTimes(2);
    });

    it('cờ workspace vẫn được tôn trọng khi chính sách cho hiện macro', () => {
        hookState.featureVisible = true;
        hookState.accountMacrosEnabled = false;
        renderHook(() => useMacroHotKeys());

        expect(fetchMacros).not.toHaveBeenCalled();
        expect(getCommandBarActions()).toEqual([]);
    });
});
