import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import GalleryView from './GalleryView';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { auth: { user: { id: 1 } } } }),
}));

// Bảy ảnh của cùng một tin: mọi mục chung message_id.
const albumOfSeven = Array.from({ length: 7 }, (_, index) => ({
    id: 100 + index,
    message_id: 55,
    file_type: 'image',
    data_url: `https://cdn.test/anh-${index + 1}.jpg`,
}));

const position = () => screen.getByTestId('gallery-position').textContent;

const swipe = (element: Element, fromX: number, toX: number) => {
    fireEvent.touchStart(element, { touches: [{ clientX: fromX, clientY: 300 }] });
    fireEvent.touchMove(element, { touches: [{ clientX: toX, clientY: 305 }] });
    fireEvent.touchEnd(element, { changedTouches: [{ clientX: toX, clientY: 305 }] });
};

describe('trình xem ảnh của một tin nhiều ảnh', () => {
    it('mở đúng ảnh được bấm, không về ảnh đầu của tin', () => {
        render(<GalleryView attachment={albumOfSeven[2]} allAttachments={albumOfSeven} onClose={vi.fn()} />);

        expect(position()).toBe('3 / 7');
        expect(document.querySelector('main img')?.getAttribute('src')).toBe('https://cdn.test/anh-3.jpg');
    });

    it('phím mũi tên và vuốt ngang chuyển ảnh, Esc đóng', async () => {
        const onClose = vi.fn();
        render(<GalleryView attachment={albumOfSeven[2]} allAttachments={albumOfSeven} onClose={onClose} />);

        // Phím tắt gắn sau khi dò xong bố cục bàn phím (bất đồng bộ).
        await waitFor(() => {
            fireEvent.keyDown(document, { key: 'ArrowRight', code: 'ArrowRight' });
            expect(position()).toBe('4 / 7');
        });

        swipe(document.querySelector('main')!, 300, 150);
        expect(position()).toBe('5 / 7');

        swipe(document.querySelector('main')!, 100, 260);
        expect(position()).toBe('4 / 7');

        fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
        expect(onClose).toHaveBeenCalled();
    });

    it('mọi nút chỉ có icon đều có nhãn cho trình đọc màn hình', () => {
        render(<GalleryView attachment={albumOfSeven[2]} allAttachments={albumOfSeven} onClose={vi.fn()} />);

        const unlabeledButtons = screen
            .getAllByRole('button')
            .filter(button => !button.textContent?.trim() && !button.getAttribute('aria-label'));

        expect(unlabeledButtons).toHaveLength(0);
    });
});
