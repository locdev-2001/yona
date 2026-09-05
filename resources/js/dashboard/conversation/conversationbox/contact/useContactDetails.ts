import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { getJson } from 'dashboard/helper/apiClient';
import type { ContactMeta } from 'dashboard/conversation/types';

// getContactDetails của ContactPanel.vue (`contacts/show`, watch theo contact.id).
// Nguồn duy nhất cho hồ sơ contact đầy đủ của panel: ContactPanel giữ state rồi
// truyền xuống ContactInfo / ConversationInfo / Contact Attributes — nạp một lần
// cho cả panel, đúng như store contacts của bản gốc.
export interface FullContact extends ContactMeta {
    created_at?: number;
}

export function useContactDetails(
    accountId: number,
    initialContact: ContactMeta,
): [FullContact, Dispatch<SetStateAction<FullContact>>] {
    const [contact, setContact] = useState<FullContact>(initialContact);

    useEffect(() => {
        let cancelled = false;
        setContact(initialContact);
        if (!initialContact.id) return undefined;

        getJson<{ payload: FullContact }>(`/api/v1/accounts/${accountId}/contacts/${initialContact.id}`).then(
            response => {
                if (!cancelled) setContact(response.payload);
            },
            () => undefined,
        );

        return () => {
            cancelled = true;
        };
    }, [accountId, initialContact]);

    return [contact, setContact];
}
