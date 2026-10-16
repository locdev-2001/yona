import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MessageAttachment } from 'dashboard/components-next/message/helpers/attachments';
import Media from './Media';

const IMAGE = {
    id: 242,
    file_type: 'image',
    data_url: '/attachments/242/token/anh-san-pham.png',
    thumb_url: '/attachments/242/token/anh-san-pham.png',
    message_id: 9,
    created_at: 1756707112,
} as unknown as MessageAttachment;

describe('lưới ảnh/video đã chia sẻ', () => {
    it('ảnh thu nhỏ tải lười, giải mã bất đồng bộ và giữ chỗ sẵn kích thước', () => {
        const { container } = render(<Media attachments={[IMAGE]} onSelect={vi.fn()} />);
        const image = container.querySelector('img')!;

        expect(image.getAttribute('loading')).toBe('lazy');
        expect(image.getAttribute('decoding')).toBe('async');
        expect(image.getAttribute('width')).toBe(image.getAttribute('height'));
    });

    // thumb_url trùng data_url: thử lại cùng địa chỉ không phát lỗi lần hai.
    it('ảnh lỗi mà bản gốc cùng địa chỉ thì hiện icon thay vì ảnh vỡ', () => {
        const { container } = render(<Media attachments={[IMAGE]} onSelect={vi.fn()} />);
        fireEvent.error(container.querySelector('img')!);

        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('.i-lucide-image')).not.toBeNull();
    });

    it('bản thu nhỏ lỗi thì thử bản gốc khi địa chỉ khác', () => {
        const withThumb = { ...IMAGE, thumb_url: '/thumbs/242.webp' } as MessageAttachment;
        const { container } = render(<Media attachments={[withThumb]} onSelect={vi.fn()} />);
        fireEvent.error(container.querySelector('img')!);

        expect(container.querySelector('img')?.getAttribute('src')).toBe(IMAGE.data_url);
    });
});
