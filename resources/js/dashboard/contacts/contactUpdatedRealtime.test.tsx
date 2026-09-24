import { act, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { emitter } from 'shared/helpers/emitter';
import type { Contact } from './types';

vi.mock('@inertiajs/react', () => ({
    router: { visit: vi.fn() },
    usePage: () => ({
        props: {
            auth: { user: { id: 1, ui_settings: {} } },
            currentAccount: { id: 2, features: {} },
            currentAccountUser: { role: 'agent' },
            contactId: 3,
        },
    }),
}));

const fetchContacts = vi.fn();
const fetchContact = vi.fn();
vi.mock('dashboard/contacts/api', async importOriginal => ({
    ...(await importOriginal<typeof import('dashboard/contacts/api')>()),
    fetchContacts: (...args: unknown[]) => fetchContacts(...args),
    fetchContact: (...args: unknown[]) => fetchContact(...args),
}));

vi.mock('dashboard/composables/useCustomViews', () => ({ useCustomViews: () => [] }));
vi.mock('../Dashboard', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('dashboard/components-next/Contacts/ContactsListLayout', () => ({
    default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('dashboard/components-next/Contacts/ContactsDetailsLayout', () => ({
    default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

function ContactProbe({ contact }: { contact: Contact }) {
    return (
        <li data-testid={`contact-${contact.id}`}>
            {contact.name}|{contact.thumbnail}|{contact.phoneNumber}|{contact.availabilityStatus}
        </li>
    );
}

vi.mock('dashboard/components-next/Contacts/Pages/ContactsList', () => ({
    default: ({ contacts }: { contacts: Contact[] }) => (
        <ul>
            {contacts.map(contact => (
                <ContactProbe key={contact.id} contact={contact} />
            ))}
        </ul>
    ),
}));
vi.mock('dashboard/components-next/Contacts/Pages/ContactDetails', () => ({
    default: ({ selectedContact }: { selectedContact: Contact }) => <ContactProbe contact={selectedContact} />,
}));

import ContactsIndex from './Index';
import ContactShow from './Show';

function buildContact(id: number, overrides: Partial<Contact> = {}): Contact {
    return {
        id,
        name: `Khách ${id}`,
        email: null,
        phoneNumber: `+8490000000${id}`,
        identifier: null,
        thumbnail: `https://yona.test/${id}.png`,
        availabilityStatus: 'online',
        additionalAttributes: {},
        customAttributes: {},
        ...overrides,
    };
}

// push_event_data của liên hệ (snake_case) + phong bì broadcast.
function contactUpdatedPayload(id: number, fields: Record<string, unknown>) {
    return {
        id,
        name: `Khách ${id}`,
        email: null,
        phone_number: `+8490000000${id}`,
        identifier: null,
        thumbnail: `https://yona.test/${id}.png`,
        additional_attributes: {},
        custom_attributes: {},
        blocked: false,
        type: 'contact',
        account_id: 2,
        performer: { id: 7, name: 'Nhân viên', type: 'user' },
        ...fields,
    };
}

const emitContactUpdated = (payload: Record<string, unknown>) =>
    act(() => {
        emitter.emit('contact.updated', payload);
    });

describe('contact.updated trên trang Liên hệ', () => {
    beforeEach(() => {
        fetchContacts.mockReset();
        fetchContact.mockReset();
        fetchContacts.mockResolvedValue({
            contacts: [buildContact(3), buildContact(4)],
            meta: { count: 2, currentPage: 1 },
        });
        fetchContact.mockResolvedValue(buildContact(3));
    });

    it('danh sách: liên hệ cùng id đổi tên và ảnh, liên hệ khác giữ nguyên', async () => {
        render(<ContactsIndex />);
        await waitFor(() => expect(screen.getByTestId('contact-3')).toBeTruthy());

        emitContactUpdated(contactUpdatedPayload(3, { name: 'Lan', thumbnail: 'https://yona.test/lan.png' }));

        expect(screen.getByTestId('contact-3').textContent).toBe('Lan|https://yona.test/lan.png|+84900000003|online');
        expect(screen.getByTestId('contact-4').textContent).toBe('Khách 4|https://yona.test/4.png|+84900000004|online');
    });

    it('danh sách: xoá ảnh ở máy khác thì ảnh về rỗng', async () => {
        render(<ContactsIndex />);
        await waitFor(() => expect(screen.getByTestId('contact-3')).toBeTruthy());

        emitContactUpdated(contactUpdatedPayload(3, { thumbnail: '' }));

        expect(screen.getByTestId('contact-3').textContent).toBe('Khách 3||+84900000003|online');
    });

    it('chi tiết: đổi theo liên hệ đang xem, bỏ qua liên hệ khác', async () => {
        render(<ContactShow />);
        await waitFor(() => expect(screen.getByTestId('contact-3')).toBeTruthy());

        emitContactUpdated(contactUpdatedPayload(4, { name: 'Người khác', thumbnail: '' }));
        expect(screen.getByTestId('contact-3').textContent).toBe('Khách 3|https://yona.test/3.png|+84900000003|online');

        emitContactUpdated(contactUpdatedPayload(3, { name: 'Lan', thumbnail: '' }));
        expect(screen.getByTestId('contact-3').textContent).toBe('Lan||+84900000003|online');
    });
});
