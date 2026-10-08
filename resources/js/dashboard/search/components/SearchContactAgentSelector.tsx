import { useEffect, useRef, useState } from 'react';

import { t } from '../../../i18n';
import { getJson } from 'dashboard/helper/apiClient';
import { useClickAway } from 'dashboard/composables/useClickAway';
import Button from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { searchContacts } from 'dashboard/contacts/api';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import { fetchContactDetails } from '../helpers/searchHelper';

// Port từ dashboard/modules/search/components/SearchContactAgentSelector.vue.
const FROM_TYPE = { CONTACT: 'contact', AGENT: 'agent' } as const;
const SEARCH_DEBOUNCE_DELAY = 300;

interface SelectorAgent {
    id: number;
    name: string;
    thumbnail?: string;
    confirmed?: boolean;
}

interface SelectorContact {
    id: number;
    name: string;
    email?: string | null;
    phoneNumber?: string | null;
    thumbnail?: string;
}

interface SearchContactAgentSelectorProps {
    label: string;
    accountId: number;
    value: string | null;
    onChange: (value: string | null) => void;
}

export default function SearchContactAgentSelector({
    label,
    accountId,
    value,
    onChange,
}: SearchContactAgentSelectorProps) {
    const container = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const [showDropdown, setShowDropdown] = useState(false);
    const [agents, setAgents] = useState<SelectorAgent[]>([]);
    const [searchedContacts, setSearchedContacts] = useState<SelectorContact[]>([]);
    const [isSearching, setSearching] = useState(false);
    const [selectedContact, setSelectedContact] = useState<SelectorContact | null>(null);

    useClickAway(container, () => setShowDropdown(false));

    useEffect(() => {
        getJson<SelectorAgent[]>(`/api/v1/accounts/${accountId}/agents`)
            .then(payload => setAgents(payload.filter(agent => agent.confirmed !== false)))
            .catch(() => undefined);
    }, [accountId]);

    // Khôi phục tên liên hệ khi bộ lọc đến từ URL (chỉ có id trong `from`).
    useEffect(() => {
        const [type, id] = (value ?? '').split(':');
        if (type !== FROM_TYPE.CONTACT) return;

        const numericId = Number(id);
        if (selectedContact?.id === numericId) return;

        void fetchContactDetails(accountId, numericId).then(contact => {
            if (contact) {
                setSelectedContact({ id: contact.id, name: contact.name, thumbnail: contact.thumbnail });
            }
        });
    }, [accountId, value, selectedContact?.id]);

    useEffect(() => () => clearTimeout(debounceTimer.current), []);

    const performSearch = (query: string) => {
        clearTimeout(debounceTimer.current);
        if (query) {
            setSearchedContacts(selectedContact ? [selectedContact] : []);
            setSearching(true);
        }

        debounceTimer.current = setTimeout(async () => {
            if (!query) {
                setSearchedContacts(selectedContact ? [selectedContact] : []);
                setSearching(false);

                return;
            }

            try {
                const page = await searchContacts(accountId, query, 1, 'name');
                const contacts = page.contacts as unknown as SelectorContact[];
                setSearchedContacts(
                    selectedContact
                        ? [selectedContact, ...contacts.filter(contact => contact.id !== selectedContact.id)]
                        : contacts,
                );
            } catch {
                // Bỏ qua như bản gốc.
            } finally {
                setSearching(false);
            }
        }, SEARCH_DEBOUNCE_DELAY);
    };

    const selectedLabel = (() => {
        if (!value) return label;

        const [type, id] = value.split(':');
        const numericId = Number(id);

        if (type === FROM_TYPE.CONTACT) {
            const contact =
                selectedContact?.id === numericId
                    ? selectedContact
                    : searchedContacts.find(item => item.id === numericId);
            if (contact) return `${label}: ${contact.name}`;
        } else {
            const agent = agents.find(item => item.id === numericId);
            if (agent) return `${label}: ${agent.name}`;
        }

        return `${label}: ${numericId}`;
    })();

    return (
        <div ref={container} className="relative flex items-center group min-w-0 max-w-full">
            <Button
                sm
                slate
                variant={showDropdown ? 'faded' : 'ghost'}
                label={selectedLabel}
                trailingIcon
                icon="i-lucide-chevron-down"
                className="!px-2 max-w-full"
                onClick={() => {
                    if (!showDropdown) setSearchedContacts(selectedContact ? [selectedContact] : []);
                    setShowDropdown(open => !open);
                }}
            />
            {showDropdown ? (
                <DropdownMenu
                    className="mt-1 ltr:left-0 rtl:right-0 top-full w-64 max-h-80"
                    showSearch
                    disableLocalFiltering
                    isSearching={isSearching}
                    onSearch={performSearch}
                    menuSections={[
                        {
                            title: t('SEARCH.FILTERS.CONTACTS'),
                            isLoading: isSearching,
                            emptyState: t('SEARCH.FILTERS.NO_CONTACTS'),
                            items: searchedContacts.map(contact => ({
                                label: contact.name,
                                value: `${FROM_TYPE.CONTACT}:${contact.id}`,
                                action: 'select',
                                type: FROM_TYPE.CONTACT,
                                description: contact.email || contact.phoneNumber || '',
                                thumbnail: { name: contact.name, src: contact.thumbnail ?? '', seed: avatarSeed('contact', contact.id) },
                                isSelected: value === `${FROM_TYPE.CONTACT}:${contact.id}`,
                            })),
                        },
                        {
                            title: t('SEARCH.FILTERS.AGENTS'),
                            emptyState: t('SEARCH.FILTERS.NO_AGENTS'),
                            items: agents.map(agent => ({
                                label: agent.name,
                                value: `${FROM_TYPE.AGENT}:${agent.id}`,
                                action: 'select',
                                type: FROM_TYPE.AGENT,
                                thumbnail: { name: agent.name, src: agent.thumbnail ?? '', seed: avatarSeed('user', agent.id) },
                                isSelected: value === `${FROM_TYPE.AGENT}:${agent.id}`,
                            })),
                        },
                    ]}
                    onAction={item => {
                        const itemValue = String(item.value);
                        if (value === itemValue) {
                            onChange(null);
                            setSelectedContact(null);
                        } else {
                            onChange(itemValue);
                            setSelectedContact(
                                item.type === FROM_TYPE.CONTACT
                                    ? {
                                          id: Number(itemValue.split(':')[1]),
                                          name: item.label,
                                          thumbnail: item.thumbnail?.src,
                                      }
                                    : null,
                            );
                        }
                        setShowDropdown(false);
                    }}
                />
            ) : null}
        </div>
    );
}
