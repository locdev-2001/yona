import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import CaretAnchoredPicker from './CaretAnchoredPicker';
import { isPickerOwnedKey } from './Editor';

// jsdom chưa có ResizeObserver — CaretAnchoredPicker đo khối neo bằng nó.
class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;

// tinykeys 4 chỉ nhận sự kiện có đủ key + code + getModifierState.
const pressKey = (key: string, init: KeyboardEventInit = {}) =>
    fireEvent.keyDown(document, { key, code: key, ...init });

const ITEMS = [
    { id: 1, title: '/xinchao' },
    { id: 2, title: '/camon' },
];

function renderPicker(overrides: Record<string, unknown> = {}) {
    const handlers = {
        onSelect: vi.fn(),
        onClose: vi.fn(),
        onRemoveTrigger: vi.fn(),
    };

    render(
        <>
            <input aria-label="ô soạn giả lập" />
            <CaretAnchoredPicker
                caretPosition={{ top: 10, height: 20 }}
                items={ITEMS}
                search=""
                onSearchChange={() => undefined}
                searchPlaceholder="Tìm kiếm…"
                keepFocusInEditor
                {...handlers}
                {...overrides}
            />
        </>,
    );

    return handlers;
}

describe('CaretAnchoredPicker · keepFocusInEditor', () => {
    it('không dựng ô tìm kiếm riêng nên không cướp focus của ô soạn', async () => {
        renderPicker();

        const editorStandIn = screen.getByLabelText('ô soạn giả lập');
        editorStandIn.focus();
        await screen.findByRole('listbox');

        expect(screen.queryByRole('combobox')).toBeNull();
        expect(document.activeElement).toBe(editorStandIn);
    });

    it('Escape đóng bảng và báo là đóng bằng phím (để ô soạn lấy lại con trỏ)', async () => {
        const { onClose } = renderPicker();
        await screen.findByRole('listbox');

        pressKey('Escape');

        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
        expect(onClose).toHaveBeenCalledWith('keyboard');
    });

    it('bấm ra ngoài đóng bảng nhưng KHÔNG đòi lại con trỏ', async () => {
        const { onClose } = renderPicker();
        await screen.findByRole('listbox');

        fireEvent.mouseDown(document.body);

        await waitFor(() => expect(onClose).toHaveBeenCalledWith('outside'));
    });

    it('Enter chọn mục đang chọn', async () => {
        const { onSelect } = renderPicker();
        await screen.findByRole('listbox');

        pressKey('Enter');

        await waitFor(() => expect(onSelect).toHaveBeenCalledWith(ITEMS[0]));
    });

    it('Backspace thuộc về ô soạn — bảng không tự xoá ký tự kích hoạt', async () => {
        const { onRemoveTrigger } = renderPicker();
        await screen.findByRole('listbox');

        pressKey('Backspace');
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(onRemoveTrigger).not.toHaveBeenCalled();
    });

    it('vẫn giữ đường cũ: có ô tìm kiếm thì Backspace gỡ ký tự kích hoạt', async () => {
        const { onRemoveTrigger } = renderPicker({ keepFocusInEditor: false });
        await screen.findByRole('combobox');

        pressKey('Backspace');

        await waitFor(() => expect(onRemoveTrigger).toHaveBeenCalledTimes(1));
    });

    it('bảng bung lên trên dừng ở mép khối chừa chỗ, không che thanh tab', async () => {
        // jsdom trả rect toàn số 0 — giả lập con trỏ nằm trong khối soạn ở đáy màn.
        const originalRect = Element.prototype.getBoundingClientRect;
        Element.prototype.getBoundingClientRect = () =>
            ({ top: 600, bottom: 620, left: 100, right: 500, width: 400 }) as DOMRect;
        const boundary = document.createElement('div');
        boundary.getBoundingClientRect = () => ({ top: 500 }) as DOMRect;

        renderPicker({ boundaryElement: boundary });
        Element.prototype.getBoundingClientRect = originalRect;
        const picker = await screen.findByRole('listbox');
        const card = picker.closest('[data-popover-content]') as HTMLElement;

        // windowHeight (768 trong jsdom) - boundaryTop (500) + GAP (8).
        expect(card.style.bottom).toBe(`${window.innerHeight - 500 + 8}px`);
    });
});

describe('isPickerOwnedKey', () => {
    it.each(['Enter', 'Tab', 'ArrowUp', 'ArrowDown'])('bảng giữ phím %s', key => {
        expect(isPickerOwnedKey(new KeyboardEvent('keydown', { key }))).toBe(true);
    });

    it('Shift+Enter vẫn là xuống dòng của ô soạn', () => {
        expect(isPickerOwnedKey(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }))).toBe(false);
    });

    it('Shift+Tab thuộc bảng', () => {
        expect(isPickerOwnedKey(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }))).toBe(true);
    });

    it('phím chữ vẫn gõ vào ô soạn', () => {
        expect(isPickerOwnedKey(new KeyboardEvent('keydown', { key: 'a' }))).toBe(false);
    });
});
