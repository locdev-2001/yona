import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
