import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Message from './Message';
import type { ConversationMessage } from 'dashboard/conversation/types';

vi.mock('dashboard/components/widgets/conversation/components/GalleryView', () => ({
    default: ({ attachment, allAttachments }: { attachment: { id: number }; allAttachments: { id: number }[] }) => (
        <div data-testid="gallery" data-opened={attachment.id} data-items={allAttachments.map((item) => item.id).join(',')} />
    ),
}));

const attachments = (count: number, fileType = 'image') =>
    Array.from({ length: count }, (_, index) => ({
        id: index + 1,
        file_type: fileType,
        data_url: `https://cdn.test/anh-${index + 1}.jpg`,
        width: 800,
        height: 600,
    }));

function message(overrides: Partial<ConversationMessage> = {}): ConversationMessage {
    return {
        id: 10,
        content: null,
        inbox_id: 1,
        conversation_id: 4,
        message_type: 0,
        content_type: 'text',
        status: 'sent',
        content_attributes: {},
        created_at: 1756707112,
        private: false,
        source_id: null,
        ...overrides,
    };
}

const renderMessage = (payload: ConversationMessage) =>
    render(<Message message={payload} channelType="Channel::Api" />).container;

const tiles = (container: HTMLElement) => container.querySelectorAll('[data-media-tile]');

describe('lưới ảnh/video trong một tin', () => {
    it.each([
        [1, 'single', 1],
        [2, 'pair', 2],
        [3, 'trio', 3],
        [4, 'quad', 4],
        [7, 'quad', 4],
    ])('%i ảnh → lưới %s với %i ô', (count, layout, tileCount) => {
        const container = renderMessage(message({ attachments: attachments(count) as never }));

        expect(container.querySelector('[data-media-grid]')?.getAttribute('data-media-grid')).toBe(layout);
        expect(tiles(container)).toHaveLength(tileCount);
    });

    it('một ảnh giữ tỉ lệ thật trong khung tối đa, không đệm quanh ảnh', () => {
        const container = renderMessage(message({ attachments: attachments(1) as never }));
        const tile = tiles(container)[0] as HTMLElement;

        expect(tile.style.width).toBe('288px');
        expect(tile.style.aspectRatio).toBe('288 / 216');
        expect(container.querySelector('[data-bubble-name="image"]')?.className).not.toMatch(/\bp-3\b/);
    });

    it('ba ảnh: ba cột trên một hàng, ô vuông đều nhau', () => {
        const container = renderMessage(message({ attachments: attachments(3) as never }));
        const grid = container.querySelector('[data-media-grid] > .grid') as HTMLElement;

        expect(grid.style.gridTemplateColumns).toBe('1fr 1fr 1fr');
        expect(Array.from(tiles(container)).every((tile) => tile.className.includes('aspect-square'))).toBe(true);
    });

    it('bảy ảnh: ô cuối hiện +4 và mở trình xem ở ảnh thứ tư, lướt đúng bảy ảnh của tin', () => {
        const container = renderMessage(message({ attachments: attachments(7) as never }));
        const overflow = container.querySelector('[data-media-overflow]');

        expect(overflow?.textContent).toBe('+4');

        fireEvent.click(tiles(container)[3]);
        const gallery = document.querySelector('[data-testid="gallery"]');

        expect(gallery?.getAttribute('data-opened')).toBe('4');
        expect(gallery?.getAttribute('data-items')).toBe('1,2,3,4,5,6,7');
    });

    it('chú thích nằm dưới lưới trong cùng bong bóng', () => {
        const container = renderMessage(message({ content: 'Mẫu này còn hàng không?', attachments: attachments(2) as never }));
        const bubble = container.querySelector('[data-bubble-name="text"]');

        expect(bubble?.querySelector('[data-media-grid]')).not.toBeNull();
        expect(bubble?.querySelector('[data-media-caption]')?.textContent).toContain('Mẫu này còn hàng không?');
        expect(
            bubble?.querySelector('[data-media-grid]')?.compareDocumentPosition(bubble.querySelector('[data-media-caption]')!),
        ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('video có nút play, không tự phát, bấm mở trình xem', () => {
        const container = renderMessage(message({ attachments: attachments(1, 'video') as never }));
        const video = container.querySelector('video');

        expect(tiles(container)[0].getAttribute('data-media-tile')).toBe('video');
        expect(video?.autoplay).toBe(false);
        expect(video?.hasAttribute('controls')).toBe(false);

        fireEvent.click(tiles(container)[0]);
        expect(document.querySelector('[data-testid="gallery"]')).not.toBeNull();
    });
});

describe('thẻ tệp trong tin', () => {
    it('một dòng: tên cắt ở giữa giữ đuôi, dung lượng, nút tải; nhiều tệp xếp dọc', () => {
        const files = [
            {
                id: 1,
                file_type: 'file',
                data_url: 'https://cdn.test/bao-gia-thang-9-khach-le-rat-dai-ban-cuoi.pdf',
                file_size: 2_516_582,
            },
            { id: 2, file_type: 'file', data_url: 'https://cdn.test/don-hang.xlsx', file_size: 20_480 },
        ];
        const container = renderMessage(message({ content: 'Gửi anh', attachments: files as never }));
        const cards = container.querySelectorAll('[data-testid="file-card"]');

        expect(cards).toHaveLength(2);
        expect(container.querySelector('[data-file-list]')?.className).toContain('flex-col');
        expect(cards[0].getAttribute('title')).toBe('bao-gia-thang-9-khach-le-rat-dai-ban-cuoi.pdf');
        expect(cards[0].textContent).toContain('cuoi.pdf');
        expect(cards[0].textContent).toContain('2.4 MB');
        expect(cards[0].querySelector('a[download]')?.getAttribute('href')).toBe(files[0].data_url);
    });
});

describe('ảnh tải hỏng trong lưới', () => {
    // Ảnh ở URL gốc luôn hỏng (trình duyệt theo chuyển hướng cũ đã lưu), URL có tham số tải lại thì được.
    function stubImageLoader(requestedUrls: string[]) {
        vi.stubGlobal(
            'Image',
            class {
                onload: (() => void) | null = null;
                onerror: (() => void) | null = null;
                set src(url: string) {
                    requestedUrls.push(url);
                    setTimeout(() => (url.includes('reload=') ? this.onload?.() : this.onerror?.()), 0);
                }
            },
        );
    }

    it('bấm ô ảnh hỏng thì tải lại bằng URL mới, không mở trình xem', async () => {
        vi.useFakeTimers();
        const requestedUrls: string[] = [];
        stubImageLoader(requestedUrls);

        const container = renderMessage(message({ attachments: attachments(1) as never }));
        await act(() => vi.runAllTimersAsync());
        const tile = tiles(container)[0] as HTMLElement;

        expect(tile.textContent).toContain('Tap to reload');

        fireEvent.click(tile);
        await act(() => vi.runAllTimersAsync());

        expect(document.querySelector('[data-testid="gallery"]')).toBeNull();
        expect(requestedUrls.at(-1)).toMatch(/^https:\/\/cdn\.test\/anh-1\.jpg\?reload=\d+$/);
        expect(container.querySelector('[data-media-tile] img')?.getAttribute('src')).toBe(requestedUrls.at(-1));

        vi.useRealTimers();
        vi.unstubAllGlobals();
    });
});
