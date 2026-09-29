import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const focusMessage = vi.fn(() => Promise.resolve());

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { auth: { user: { id: 1 } } } }),
}));

vi.mock('../../api', () => ({
    fetchSharedAttachments: (_account: number, _conversation: number, kind: string) =>
        Promise.resolve(
            kind === 'files'
                ? {
                      attachments: [
                          { id: 5, message_id: 50, file_type: 'file', data_url: '/f/hoa-don.pdf', filename: 'hoa-don.pdf', created_at: 1 },
                      ],
                      totalCount: 1,
                  }
                : {
                      attachments: [
                          { id: 1, message_id: 10, file_type: 'image', data_url: 'https://cdn.test/anh-1.jpg', created_at: 200 },
                          { id: 2, message_id: 20, file_type: 'image', data_url: 'https://cdn.test/anh-2.jpg', created_at: 100 },
                      ],
                      totalCount: 2,
                  },
        ),
    fetchSharedLinks: () =>
        Promise.resolve({ messages: [{ message_id: 70, content: 'xem https://shop.vn/don/1', created_at: 1 }], hasMore: false }),
}));

vi.mock('../../ConversationContext', () => ({
    useConversation: () => ({ accountId: 2, conversationId: 7, focusMessage }),
}));

import { SharedContentTabs } from './SharedContent';

const settle = () => act(async () => undefined);
const viewerImage = () => document.querySelector('main img')?.getAttribute('src');

beforeEach(() => focusMessage.mockClear());

describe('SharedContentTabs', () => {
    it('bấm ảnh mở trình xem phóng to và lướt qua các ảnh đã tải của tab', async () => {
        render(<SharedContentTabs />);
        await settle();

        fireEvent.click(screen.getAllByRole('img')[1].closest('[role="button"]')!);

        expect(viewerImage()).toBe('https://cdn.test/anh-2.jpg');
        expect(screen.getByTestId('gallery-position').textContent).toBe('2 / 2');
        expect(focusMessage).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
        expect(viewerImage()).toBe('https://cdn.test/anh-1.jpg');
    });

    it('nút Tới tin nhắn trong trình xem đóng trình xem rồi nhảy tới tin của ảnh đang xem', async () => {
        const onJumped = vi.fn();
        render(<SharedContentTabs onJumped={onJumped} />);
        await settle();

        fireEvent.click(screen.getAllByRole('img')[0].closest('[role="button"]')!);
        fireEvent.click(screen.getByText('Jump to message'));

        expect(document.querySelector('main img')).toBeNull();
        expect(onJumped).toHaveBeenCalled();
        expect(focusMessage).toHaveBeenCalledWith(10);
    });

    it('tab Tệp mở tệp ở tab mới; tab Link mở link, nút nhỏ mới nhảy tới tin', async () => {
        const openWindow = vi.spyOn(window, 'open').mockImplementation(() => null);
        render(<SharedContentTabs />);
        await settle();

        fireEvent.click(screen.getByText('Files'));
        await settle();
        fireEvent.click(screen.getByText('hoa-don.pdf'));
        expect(openWindow).toHaveBeenCalledWith('/f/hoa-don.pdf', '_blank', 'noopener,noreferrer');
        expect(focusMessage).not.toHaveBeenCalled();

        fireEvent.click(screen.getByText('Links'));
        await settle();
        const link = screen.getByTestId('shared-link');
        expect(link.getAttribute('href')).toBe('https://shop.vn/don/1');
        expect(link.getAttribute('target')).toBe('_blank');

        fireEvent.click(screen.getByTestId('shared-link-jump'));
        expect(focusMessage).toHaveBeenCalledWith(70);

        openWindow.mockRestore();
    });
});
