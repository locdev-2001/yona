import { useContactUpdatedEvent } from 'dashboard/realtime/contactUpdated';
import { toClientContact } from './api';
import type { Contact } from './types';

export type ContactUpdate = Partial<Contact> & Pick<Contact, 'id'>;

// Khác id thì giữ nguyên object; cùng id thì ghi các trường bản mới mang và
// giữ các trường bản mới không mang (contactInboxes, availabilityStatus…).
export function mergeContactUpdate(contact: Contact, update: ContactUpdate): Contact {
    return contact.id === update.id ? { ...contact, ...update } : contact;
}

export function mergeContactUpdateIntoList(contacts: Contact[], update: ContactUpdate): Contact[] {
    if (!contacts.some(contact => contact.id === update.id)) return contacts;

    return contacts.map(contact => mergeContactUpdate(contact, update));
}

// Trang danh sách và chi tiết liên hệ nhận contact.updated ở dạng client
// (camelCase) — sửa thông tin, gắn ảnh, xoá ảnh ở máy khác đều đi qua đây.
export function useContactUpdates(onContactUpdated: (update: ContactUpdate) => void): void {
    useContactUpdatedEvent(contactFields => onContactUpdated(toClientContact(contactFields)));
}
