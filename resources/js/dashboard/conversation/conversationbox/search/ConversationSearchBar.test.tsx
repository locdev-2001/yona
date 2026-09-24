import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const focusMessage = vi.fn(() => Promise.resolve());
const searchConversationMessages = vi.fn();

vi.mock('../../api', () => ({
    searchConversationMessages: (...args: unknown[]) => searchConversationMessages(...args),
}));

vi.mock('../../ConversationContext', () => ({
    useConversation: () => ({ accountId: 2, conversationId: 7, messages: [], focusMessage }),
}));

import ConversationSearchBar from './ConversationSearchBar';
import { SEARCH_DEBOUNCE_MS } from './conversationSearch';

async function typeAndSettle(value: string) {
    fireEvent.change(screen.getByRole('searchbox'), { target: { value } });
    await act(async () => {
        vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
}

const status = () => screen.getByTestId('conversation-search-status').textContent;

describe('ConversationSearchBar', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        focusMessage.mockClear();
        searchConversationMessages.mockReset().mockResolvedValue([30, 20, 10]);
    });

    afterEach(() => vi.useRealTimers());

    it('counts matches and jumps to the newest one', async () => {
        render(<ConversationSearchBar onClose={vi.fn()} />);
        await typeAndSettle('báo giá');

        expect(searchConversationMessages).toHaveBeenCalledWith(2, 7, 'báo giá');
        expect(status()).toBe('1/3');
        expect(focusMessage).toHaveBeenLastCalledWith(30);
    });

    it('walks older with Enter and ↑, newer with Shift+Enter and ↓', async () => {
        render(<ConversationSearchBar onClose={vi.fn()} />);
        await typeAndSettle('gia');
        const input = screen.getByRole('searchbox');

        fireEvent.keyDown(input, { key: 'Enter' });
        expect(status()).toBe('2/3');
        expect(focusMessage).toHaveBeenLastCalledWith(20);

        fireEvent.click(screen.getByTitle('Older result (Enter)'));
        expect(status()).toBe('3/3');
        expect(focusMessage).toHaveBeenLastCalledWith(10);
        expect((screen.getByTitle('Older result (Enter)') as HTMLButtonElement).disabled).toBe(true);

        fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
        expect(status()).toBe('2/3');

        fireEvent.click(screen.getByTitle('Newer result (Shift+Enter)'));
        expect(status()).toBe('1/3');
        expect(focusMessage).toHaveBeenLastCalledWith(30);
    });

    it('says so when nothing matches', async () => {
        searchConversationMessages.mockResolvedValue([]);
        render(<ConversationSearchBar onClose={vi.fn()} />);
        await typeAndSettle('khong co');

        expect(status()).toBe('No results');
        expect(focusMessage).not.toHaveBeenCalled();
    });

    it('closes on Escape', () => {
        const onClose = vi.fn();
        render(<ConversationSearchBar onClose={onClose} />);

        fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });

        expect(onClose).toHaveBeenCalledOnce();
    });
});
