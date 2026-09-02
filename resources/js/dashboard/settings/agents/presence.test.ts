import { describe, expect, it } from 'vitest';

import { mergeAgentPresence } from './presence';
import { mergeContactPresence } from 'dashboard/components-next/Contacts/Pages/ContactsList';
import type { Agent } from './types';
import type { Contact } from 'dashboard/contacts/types';

const agent = (id: number, availability_status: Agent['availability_status']) =>
    ({ id, availability_status, name: `Agent ${id}` }) as Agent;

const contact = (id: number, availabilityStatus: string | null) =>
    ({ id, availabilityStatus, name: `Contact ${id}` }) as Contact;

// mutationHelpers#updatePresence ghi đè mọi record: vắng map → 'offline'.
describe('mergeAgentPresence', () => {
    const agents = [agent(1, 'online'), agent(2, 'busy'), agent(3, 'offline')];

    it('keeps the API status until the first presence.update arrives', () => {
        expect(mergeAgentPresence(agents, {}, false)).toBe(agents);
    });

    it('overrides every agent, defaulting absent ids to offline', () => {
        expect(mergeAgentPresence(agents, { 2: 'online', 3: 'busy' }, true).map(item => item.availability_status)).toEqual([
            'offline',
            'online',
            'busy',
        ]);
    });
});

// UPDATE_CONTACTS_PRESENCE: vắng map → null (chấm ẩn vì hideOfflineStatus).
describe('mergeContactPresence', () => {
    const contacts = [contact(1, 'online'), contact(2, 'offline')];

    it('keeps the API status until the first presence.update arrives', () => {
        expect(mergeContactPresence(contacts, {}, false)).toBe(contacts);
    });

    it('marks listed contacts online and clears the rest', () => {
        expect(mergeContactPresence(contacts, { 2: 'online' }, true).map(item => item.availabilityStatus)).toEqual([
            null,
            'online',
        ]);
    });
});
