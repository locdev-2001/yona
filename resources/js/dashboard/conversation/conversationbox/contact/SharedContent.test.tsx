import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const focusMessage = vi.fn(() => Promise.resolve());

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
                : { attachments: [], totalCount: 0 },
        ),
    fetchSharedLinks: () =>
        Promise.resolve({ messages: [{ message_id: 70, content: 'xem https://shop.vn/don/1', created_at: 1 }], hasMore: false }),
}));

vi.mock('../../ConversationContext', () => ({
    useConversation: () => ({ accountId: 2, conversationId: 7, focusMessage }),
}));

import { SharedContentTabs } from './SharedContent';

const settle = () => act(async () => undefined);

describe('SharedContentTabs', () => {
    it('switches between media, files and links, loading each from the server', async () => {
        render(<SharedContentTabs />);
        await settle();
        expect(screen.getByTestId('shared-content-media').textContent).toContain('Nothing here');

        fireEvent.click(screen.getByText('Files'));
        await settle();
        expect(screen.getByText('hoa-don.pdf')).toBeTruthy();

        fireEvent.click(screen.getByText('Links'));
        await settle();
        fireEvent.click(screen.getByTestId('shared-link'));

        expect(screen.getByTestId('shared-link').textContent).toContain('shop.vn');
        expect(focusMessage).toHaveBeenCalledWith(70);
    });
});
