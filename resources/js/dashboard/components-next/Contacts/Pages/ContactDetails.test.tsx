import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Contact } from 'dashboard/contacts/types';

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { currentAccount: { id: 2, features: {} }, currentAccountUser: { role: 'agent' } } }),
}));

const deleteContactAvatar = vi.fn();
vi.mock('dashboard/contacts/api', async importOriginal => ({
    ...(await importOriginal<typeof import('dashboard/contacts/api')>()),
    deleteContactAvatar: (...args: unknown[]) => deleteContactAvatar(...args),
}));
vi.mock('dashboard/composables/useAlert', () => ({ useAlert: vi.fn() }));
vi.mock('dashboard/components-next/Contacts/ContactLabels/ContactLabels', () => ({ default: () => null }));
vi.mock('dashboard/components-next/Contacts/ContactsForm/ContactsForm', () => ({ default: () => null }));

import ContactDetails from './ContactDetails';

function buildContact(overrides: Partial<Contact> = {}): Contact {
    return {
        id: 3,
        name: 'Lan',
        email: null,
        phoneNumber: null,
        identifier: null,
        thumbnail: 'https://yona.test/lan.png',
        availabilityStatus: null,
        additionalAttributes: {},
        customAttributes: {},
        ...overrides,
    };
}

const avatarImageSrc = (container: HTMLElement) => container.querySelector('img:not([data-generated-avatar] img)')?.getAttribute('src') ?? null;

describe('ảnh đại diện ở trang chi tiết liên hệ', () => {
    beforeEach(() => {
        deleteContactAvatar.mockReset();
    });

    it('đổi theo liên hệ đang hiển thị, kể cả khi ảnh bị xoá hoặc gắn ở máy khác', () => {
        const props = { onContactUpdated: vi.fn(), onGoToContactsList: vi.fn() };
        const { container, rerender } = render(<ContactDetails selectedContact={buildContact()} {...props} />);
        expect(avatarImageSrc(container)).toBe('https://yona.test/lan.png');

        rerender(<ContactDetails selectedContact={buildContact({ thumbnail: '' })} {...props} />);
        expect(avatarImageSrc(container)).toBeNull();

        rerender(<ContactDetails selectedContact={buildContact({ thumbnail: 'https://yona.test/moi.png' })} {...props} />);
        expect(avatarImageSrc(container)).toBe('https://yona.test/moi.png');
    });

    it('xoá ảnh ở máy này thì báo liên hệ server trả về cho trang', async () => {
        const withoutAvatar = buildContact({ thumbnail: '' });
        deleteContactAvatar.mockResolvedValue(withoutAvatar);
        const onContactUpdated = vi.fn();
        const { container } = render(
            <ContactDetails selectedContact={buildContact()} onContactUpdated={onContactUpdated} onGoToContactsList={vi.fn()} />,
        );

        fireEvent.click(container.querySelector('.i-lucide-x')!.parentElement!);

        await waitFor(() => expect(onContactUpdated).toHaveBeenCalledWith(withoutAvatar));
        expect(deleteContactAvatar).toHaveBeenCalledWith(2, 3);
    });

    it('đã xoá ảnh ở máy này, máy khác gắn ảnh mới thì ảnh mới vẫn hiện', async () => {
        deleteContactAvatar.mockResolvedValue(buildContact({ thumbnail: '' }));
        const props = { onContactUpdated: vi.fn(), onGoToContactsList: vi.fn() };
        const { container, rerender } = render(<ContactDetails selectedContact={buildContact()} {...props} />);
        await act(async () => {
            fireEvent.click(container.querySelector('.i-lucide-x')!.parentElement!);
        });

        rerender(<ContactDetails selectedContact={buildContact({ thumbnail: 'https://yona.test/moi.png' })} {...props} />);

        expect(avatarImageSrc(container)).toBe('https://yona.test/moi.png');
    });
});
