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
    // Lệch có chủ đích (ux-deviations.md): "Previous Conversations" đứng thứ hai
    // thay vì áp chót, và là mục DUY NHẤT mở sẵn khi người dùng chưa từng chọn.
    it('renders sections in the Yona order with previous conversations second', () => {
        const { getAllByRole } = render(<ContactPanel />);

        const headers = getAllByRole('button').filter(button => button.classList.contains('drag-handle'));
        expect(headers.map(header => header.textContent)).toEqual([
            'Conversation Actions',
            'Previous Conversations',
            'Macros',
            'Conversation Information',
            'Contact Attributes',
            'Contact Notes',
            'Attachments',
            'Conversation participants',
        ]);
    });

    it('opens only previous conversations when ui_settings has no is_*_open key', () => {
        const { getAllByRole } = render(<ContactPanel />);

        const headers = getAllByRole('button').filter(button => button.classList.contains('drag-handle'));
        const openHeaders = headers.filter(header => header.classList.contains('rounded-bl-none'));

        expect(openHeaders.map(header => header.textContent)).toEqual(['Previous Conversations']);
    });
});
