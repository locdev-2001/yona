import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// ContactPanel gốc: accordion ĐÓNG khi ui_settings thiếu key `is_*_open`.
vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            currentAccount: { id: 2, features: { macros: true } },
            currentAccountUser: { role: 'administrator' },
            auth: { user: { id: 1, message_signature: '' } },
            inboxes: [],
        },
    }),
    router: { visit: vi.fn() },
}));

vi.mock('dashboard/helper/apiClient', () => ({
    getJson: () => new Promise(() => undefined),
    patchJson: vi.fn(),
    postJson: vi.fn(),
    parseApiErrorMessage: () => null,
}));

const conversation = {
    id: 4,
    inbox_id: 1,
    meta: { sender: { id: 3, name: 'Trang Nguyen', email: 'trang@example.com', thumbnail: '' } },
};

vi.mock('../ConversationContext', () => ({
    useConversation: () => ({
        selectedConversation: conversation,
        uiSettings: { sidebar_width: 200, is_contact_sidebar_open: false },
        updateUISettings: vi.fn(),
    }),
}));

import ContactPanel from './ContactPanel';

describe('ContactPanel accordions', () => {
    it('renders every section closed when ui_settings has no is_*_open key', () => {
        const { container, getAllByRole } = render(<ContactPanel />);

        const headers = getAllByRole('button').filter(button => button.classList.contains('drag-handle'));
        expect(headers.map(header => header.textContent)).toEqual([
            'Conversation Actions',
            'Macros',
            'Conversation Information',
            'Contact Attributes',
            'Contact Notes',
            'Attachments',
            'Previous Conversations',
            'Conversation participants',
        ]);
        headers.forEach(header => expect(header).not.toHaveClass('rounded-bl-none'));
        expect(container.querySelectorAll('.list-group .outline.border-t-0').length).toBe(0);
    });
});
