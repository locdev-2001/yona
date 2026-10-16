import { fireEvent, render } from '@testing-library/react';
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
    // Quyết định UX có chủ đích (docs/ux-decisions.md): "Ảnh, tệp, link" rồi "Hội thoại
    // trước" ngay sau khối hành động; "Hội thoại trước" là mục DUY NHẤT mở sẵn.
    it('renders sections in the Yona order: actions, shared media, then previous conversations', () => {
        const { getAllByRole } = render(<ContactPanel />);

        const headers = getAllByRole('button').filter(button => button.classList.contains('drag-handle'));
        expect(headers.map(header => header.textContent)).toEqual([
            'Conversation Actions',
            'Media, files and links',
            'Previous Conversations',
            'Contact Notes',
        ]);
    });

    it('opens only previous conversations when ui_settings has no is_*_open key', () => {
        const { getAllByRole } = render(<ContactPanel />);

        const headers = getAllByRole('button').filter(button => button.classList.contains('drag-handle'));
        const openHeaders = headers.filter(header => header.getAttribute('aria-expanded') === 'true');

        expect(openHeaders.map(header => header.textContent)).toEqual(['Previous Conversations']);
    });

    // Đang ở ngay trong hội thoại với khách nên "tin nhắn mới" không đứng ở hàng nút;
    // nó và nút xoá vào menu ⋯, xoá ở cuối và đi qua dialog xác nhận.
    it('keeps edit and merge in the action row and moves compose and delete into the more menu', () => {
        const { container, getByTitle, queryByTitle } = render(<ContactPanel />);

        expect(queryByTitle('New message')).toBeNull();
        expect(queryByTitle('Delete Contact')).toBeNull();
        expect(getByTitle('Edit Contact')).toBeTruthy();

        fireEvent.click(getByTitle('More actions'));
        const menuLabels = [...container.querySelectorAll('.overlay-surface button span.truncate')].map(
            label => label.textContent,
        );

        expect(menuLabels).toEqual(['Start a new conversation', 'Delete contact']);
    });
});
