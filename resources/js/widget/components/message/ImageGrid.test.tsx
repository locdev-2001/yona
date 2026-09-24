import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ImageGrid from './ImageGrid';
import type { MessageAttachment } from '../../types';

const images = (count: number, overrides: Partial<MessageAttachment> = {}): MessageAttachment[] =>
    Array.from({ length: count }, (_, index) => ({
        id: index + 1,
        file_type: 'image',
        data_url: `/anh-${index + 1}.png`,
        ...overrides,
    }));

const gridOf = (container: HTMLElement) => container.querySelector('.yona-image-grid') as HTMLElement;

describe('ImageGrid', () => {
    it('một ảnh là ô đơn một cột', () => {
        const { container } = render(<ImageGrid images={images(1)} isOwn position="single" />);

        expect(gridOf(container).dataset.layout).toBe('single');
        expect(gridOf(container).style.gridTemplateColumns).toBe('1fr');
    });

    it('hai ảnh hai cột, bốn ảnh lưới 2×2 không có ô +N', () => {
        const pair = render(<ImageGrid images={images(2)} isOwn position="single" />);
        expect(gridOf(pair.container).dataset.layout).toBe('pair');
        expect(gridOf(pair.container).style.gridTemplateColumns).toBe('1fr 1fr');

        const quad = render(<ImageGrid images={images(4)} isOwn position="single" />);
        expect(quad.container.querySelectorAll('.yona-image-grid img')).toHaveLength(4);
        expect(quad.container.textContent).not.toContain('+');
    });

    it('sáu ảnh: ba ô ảnh + ô "+3" mở xem toàn bộ', () => {
        const { container } = render(<ImageGrid images={images(6)} isOwn position="single" />);

        expect(container.querySelectorAll('.yona-image-grid img')).toHaveLength(3);
        fireEvent.click(screen.getByText('+3'));

        expect(screen.getByRole('dialog').textContent).toContain('4/6');
    });

    it('ảnh đang tải có thanh tiến trình nằm trong ô', () => {
        render(<ImageGrid images={images(2, { status: 'in_progress', progress: 40 })} isOwn position="single" />);

        const bars = screen.getAllByRole('progressbar');
        expect(bars).toHaveLength(2);
        expect(bars[0].getAttribute('aria-valuenow')).toBe('40');
    });

    it('bo góc thu lại ở cạnh nối khi lưới nằm giữa nhóm', () => {
        const { container } = render(<ImageGrid images={images(2)} isOwn position="middle" />);

        expect(gridOf(container).style.borderRadius).toBe(
            'var(--yona-chat-radius-bubble) var(--yona-chat-radius-stack) var(--yona-chat-radius-stack) var(--yona-chat-radius-bubble)',
        );
    });
});
