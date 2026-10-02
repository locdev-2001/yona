import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const conversationState = vi.hoisted(() => ({ uiSettings: {} as Record<string, unknown>, updateUISettings: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 2, features: {} } } }),
}));

vi.mock('./ConversationContext', () => ({
    useConversation: () => conversationState,
}));

import ConversationSidebar from './conversationbox/ConversationSidebar';
import { setContactPanelOverlayOpen, useContactPanelControl } from './contactPanelVisibility';

function setViewportWidth(width: number) {
    Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
    act(() => {
        window.dispatchEvent(new Event('resize'));
    });
}

const originalWidth = window.innerWidth;

beforeEach(() => setContactPanelOverlayOpen(false));

afterEach(() => {
    setContactPanelOverlayOpen(false);
    Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true, writable: true });
});

describe('panel phải trên màn hẹp là lớp phủ', () => {
    it('không mở sẵn dù ui_settings nhớ "mở" từ màn rộng', () => {
        Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true, writable: true });
        const updateUISettings = vi.fn();
        const { result } = renderHook(() => useContactPanelControl({ is_contact_sidebar_open: true }, updateUISettings));

        expect(result.current.isOpen).toBe(false);
    });

    it('bấm nút thì mở lớp phủ mà KHÔNG ghi ui_settings', () => {
        Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true, writable: true });
        const updateUISettings = vi.fn();
        const { result } = renderHook(() => useContactPanelControl({}, updateUISettings));

        act(() => result.current.toggle());

        expect(result.current.isOpen).toBe(true);
        expect(updateUISettings).not.toHaveBeenCalled();

        act(() => result.current.setOpen(false));
        expect(result.current.isOpen).toBe(false);
    });

    it('lớp phủ đang mở mà kéo rộng cửa sổ thì quay về lựa chọn đã lưu', () => {
        Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true, writable: true });
        const updateUISettings = vi.fn();
        const { result } = renderHook(() =>
            useContactPanelControl({ is_contact_sidebar_open: false }, updateUISettings),
        );

        act(() => result.current.toggle());
        expect(result.current.isOpen).toBe(true);

        setViewportWidth(1440);
        expect(result.current.isOpen).toBe(false);
    });
});

describe('panel phải trên màn rộng vẫn ghi ui_settings', () => {
    it('mặc định mở sẵn từ 1280px và nút đóng ghi lựa chọn', () => {
        Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true, writable: true });
        const updateUISettings = vi.fn();
        const { result } = renderHook(() => useContactPanelControl({}, updateUISettings));

        expect(result.current.isOpen).toBe(true);

        act(() => result.current.toggle());
        expect(updateUISettings).toHaveBeenCalledWith({
            is_contact_sidebar_open: false,
            is_copilot_panel_open: false,
        });
    });
});

describe('nút mở panel nằm trong cột phải, không nổi đè khung tin', () => {
    it('màn rộng đã đóng panel: cột phải thu thành dải chỉ còn nút mở, bấm thì ghi lựa chọn mở', () => {
        Object.defineProperty(window, 'innerWidth', { value: 1440, configurable: true, writable: true });
        conversationState.uiSettings = { is_contact_sidebar_open: false };
        conversationState.updateUISettings = vi.fn();

        render(<ConversationSidebar />);

        expect(screen.queryByTestId('conversation-sidebar')).toBeNull();
        const rail = screen.getByTestId('conversation-sidebar-rail');
        act(() => rail.querySelector('button')!.click());
        expect(conversationState.updateUISettings).toHaveBeenCalledWith({
            is_contact_sidebar_open: true,
            is_copilot_panel_open: false,
        });
    });

    it('màn hẹp đã đóng lớp phủ: không vẽ dải nào, nút mở nằm ở mũ khung chat', () => {
        Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true, writable: true });
        conversationState.uiSettings = {};

        const { container } = render(<ConversationSidebar />);

        expect(container.innerHTML).toBe('');
    });
});
