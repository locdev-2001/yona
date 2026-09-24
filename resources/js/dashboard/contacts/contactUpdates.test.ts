import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { emitter } from 'shared/helpers/emitter';
import { mergeContactUpdate, mergeContactUpdateIntoList, useContactUpdates } from './contactUpdates';
import type { Contact } from './types';

function buildContact(id: number, overrides: Partial<Contact> = {}): Contact {
    return {
        id,
        name: `Khách ${id}`,
        email: null,
        phoneNumber: null,
        identifier: null,
        thumbnail: `https://yona.test/${id}.png`,
        availabilityStatus: 'online',
        additionalAttributes: {},
        customAttributes: {},
        contactInboxes: [],
        ...overrides,
    };
}

describe('mergeContactUpdate', () => {
    it('cùng id: ghi trường bản mới mang, giữ trường bản mới không mang', () => {
        const contact = buildContact(3);

        expect(mergeContactUpdate(contact, { id: 3, name: 'Lan', thumbnail: '' })).toEqual({
            ...contact,
            name: 'Lan',
            thumbnail: '',
        });
    });

    it('khác id: trả nguyên object cũ', () => {
        const contact = buildContact(3);

        expect(mergeContactUpdate(contact, { id: 4, name: 'Lan' })).toBe(contact);
    });
});

describe('mergeContactUpdateIntoList', () => {
    it('chỉ liên hệ cùng id đổi, liên hệ khác giữ nguyên object', () => {
        const [lan, binh] = [buildContact(3), buildContact(4)];

        const result = mergeContactUpdateIntoList([lan, binh], { id: 3, name: 'Lan' });

        expect(result[0]).toEqual({ ...lan, name: 'Lan' });
        expect(result[1]).toBe(binh);
    });

    it('không có liên hệ nào cùng id thì giữ nguyên danh sách', () => {
        const contacts = [buildContact(3)];

        expect(mergeContactUpdateIntoList(contacts, { id: 99, name: 'Lạ' })).toBe(contacts);
    });
});

describe('useContactUpdates', () => {
    it('đổi payload sang dạng client và bỏ phong bì broadcast', () => {
        const onContactUpdated = vi.fn();
        renderHook(() => useContactUpdates(onContactUpdated));

        act(() => {
            emitter.emit('contact.updated', {
                id: 3,
                name: 'Lan',
                phone_number: '+84900000003',
                thumbnail: '',
                additional_attributes: { company_name: 'Yona' },
                custom_attributes: { ma_khach: 'K1' },
                account_id: 2,
                performer: { id: 7, type: 'user' },
            });
        });

        expect(onContactUpdated).toHaveBeenCalledWith({
            id: 3,
            name: 'Lan',
            phoneNumber: '+84900000003',
            thumbnail: '',
            additionalAttributes: { companyName: 'Yona' },
            customAttributes: { ma_khach: 'K1' },
        });
    });

    it('bỏ qua payload không có id', () => {
        const onContactUpdated = vi.fn();
        renderHook(() => useContactUpdates(onContactUpdated));

        act(() => {
            emitter.emit('contact.updated', { name: 'Không id' });
            emitter.emit('contact.updated', null);
        });

        expect(onContactUpdated).not.toHaveBeenCalled();
    });
});
