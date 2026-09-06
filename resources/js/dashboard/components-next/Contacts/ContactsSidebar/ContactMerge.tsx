import { useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import ContactMergeForm from 'dashboard/components-next/Contacts/ContactsForm/ContactMergeForm';
import type { ComboBoxOption } from 'dashboard/components-next/combobox/ComboBox';
import { useAlert } from 'dashboard/composables/useAlert';
import { mergeContacts } from 'dashboard/conversation/panelApi';
import { getJson } from 'dashboard/helper/apiClient';
import type { Contact } from 'dashboard/contacts/types';
import type { DashboardPageProps } from '../../../types';

// Port từ components-next/Contacts/ContactsSidebar/ContactMerge.vue.
const SEARCH_DEBOUNCE_DELAY = 300;

interface ContactMergeProps {
    selectedContact: Contact;
    onGoToContactsList: () => void;
    onResetTab: () => void;
}

export default function ContactMerge({ selectedContact, onGoToContactsList, onResetTab }: ContactMergeProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;

    const [primaryContactId, setPrimaryContactId] = useState<number | null>(null);
    const [searchResults, setSearchResults] = useState<ComboBoxOption[]>([]);
    const [isSearching, setSearching] = useState(false);
    const [isMerging, setMerging] = useState(false);
    const [hasError, setError] = useState(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const onContactSearch = (query: string) => {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(async () => {
            setSearching(true);
            setSearchResults([]);
            try {
                const response = await getJson<{ payload: { id: number; name: string }[] }>(
                    `/api/v1/accounts/${accountId}/contacts/search?q=${encodeURIComponent(query)}`,
                );
                setSearchResults(
                    (response.payload ?? [])
                        .filter(contact => contact.id !== selectedContact.id)
                        .map(contact => ({ value: String(contact.id), label: `(ID: ${contact.id}) ${contact.name}` })),
                );
            } catch {
                useAlert(t('CONTACTS_LAYOUT.SIDEBAR.MERGE.SEARCH_ERROR_MESSAGE'));
            } finally {
                setSearching(false);
            }
        }, SEARCH_DEBOUNCE_DELAY);
    };

    const resetState = () => {
        if (primaryContactId === null) onResetTab();
        setPrimaryContactId(null);
        setSearchResults([]);
        setSearching(false);
        setError(false);
    };

    const onMerge = async () => {
        if (!primaryContactId) {
            setError(true);
            return;
        }

        setMerging(true);
        try {
            // base = liên hệ chính giữ lại, mergee = liên hệ đang mở.
            await mergeContacts(accountId, primaryContactId, selectedContact.id);
            onGoToContactsList();
            useAlert(t('CONTACTS_LAYOUT.SIDEBAR.MERGE.SUCCESS_MESSAGE'));
            resetState();
        } catch {
            useAlert(t('CONTACTS_LAYOUT.SIDEBAR.MERGE.ERROR_MESSAGE'));
        } finally {
            setMerging(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 px-6">
            <div className="flex flex-col gap-2">
                <h4 className="text-base text-n-slate-12">{t('CONTACTS_LAYOUT.SIDEBAR.MERGE.TITLE')}</h4>
                <p className="text-sm text-n-slate-11">{t('CONTACTS_LAYOUT.SIDEBAR.MERGE.DESCRIPTION')}</p>
            </div>
            <ContactMergeForm
                selectedContact={selectedContact}
                primaryContactId={primaryContactId}
                primaryContactList={searchResults}
                isSearching={isSearching}
                hasError={hasError}
                errorMessage={hasError ? t('CONTACTS_LAYOUT.SIDEBAR.MERGE.PRIMARY_REQUIRED_ERROR') : ''}
                onChangePrimaryContact={value => {
                    setPrimaryContactId(value);
                    setError(false);
                }}
                onSearch={onContactSearch}
            />
            <div className="flex items-center justify-between gap-3">
                <Button
                    variant="faded"
                    color="slate"
                    label={t('CONTACTS_LAYOUT.SIDEBAR.MERGE.BUTTONS.CANCEL')}
                    className="w-full bg-n-alpha-2 text-n-blue-11 hover:bg-n-alpha-3"
                    onClick={resetState}
                />
                <Button
                    label={t('CONTACTS_LAYOUT.SIDEBAR.MERGE.BUTTONS.CONFIRM')}
                    className="w-full"
                    isLoading={isMerging}
                    disabled={isMerging}
                    onClick={() => void onMerge()}
                />
            </div>
        </div>
    );
}
