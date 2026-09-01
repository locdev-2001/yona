import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import Dashboard from '../Dashboard';
import ContactsDetailsLayout from 'dashboard/components-next/Contacts/ContactsDetailsLayout';
import Spinner from 'dashboard/components-next/spinner/Spinner';
import ContactDetails from 'dashboard/components-next/Contacts/Pages/ContactDetails';
import TabBar from 'dashboard/components-next/tabbar/TabBar';
import { fetchContact, updateContact } from 'dashboard/contacts/api';
import type { Contact } from 'dashboard/contacts/types';
import type { DashboardPageProps } from '../types';

// Port từ dashboard/routes/dashboard/contacts/pages/ContactManageView.vue.
// Nội dung các tab sidebar (Attributes/History/Notes/Media/Merge) để trống
// chờ feature tương ứng (custom attributes E1, conversations B3, notes, merge B11).
const CONTACT_TABS_OPTIONS = [
    { key: 'ATTRIBUTES', value: 'attributes' },
    { key: 'HISTORY', value: 'history' },
    { key: 'NOTES', value: 'notes' },
    { key: 'MEDIA', value: 'media' },
    { key: 'MERGE', value: 'merge' },
];

interface ContactShowPageProps extends DashboardPageProps {
    contactId: number;
}

export default function ContactShow() {
    const { currentAccount, contactId } = usePage<ContactShowPageProps>().props;
    const accountId = currentAccount.id;

    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [isFetchingItem, setFetchingItem] = useState(true);
    const [isUpdating, setUpdating] = useState(false);
    const [activeTab, setActiveTab] = useState('attributes');

    useEffect(() => {
        let active = true;

        fetchContact(accountId, contactId)
            .then(contact => {
                if (active) setSelectedContact(contact);
            })
            .finally(() => {
                if (active) setFetchingItem(false);
            });

        return () => {
            active = false;
        };
    }, [accountId, contactId]);

    const tabs = CONTACT_TABS_OPTIONS.map(tab => ({
        label: t(`CONTACTS_LAYOUT.SIDEBAR.TABS.${tab.key}`),
        value: tab.value,
    }));
    const activeTabIndex = CONTACT_TABS_OPTIONS.findIndex(tab => tab.value === activeTab);

    const goToContactsList = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            router.visit(`/app/accounts/${accountId}/contacts?page=1`);
        }
    };

    const toggleContactBlock = async (isBlocked: boolean) => {
        if (!selectedContact) return;

        setUpdating(true);
        try {
            const updated = await updateContact(accountId, selectedContact.id, { blocked: !isBlocked });
            setSelectedContact(updated);
            useAlert(
                isBlocked
                    ? t('CONTACTS_LAYOUT.HEADER.ACTIONS.UNBLOCK_SUCCESS_MESSAGE')
                    : t('CONTACTS_LAYOUT.HEADER.ACTIONS.BLOCK_SUCCESS_MESSAGE'),
            );
        } catch {
            useAlert(
                isBlocked
                    ? t('CONTACTS_LAYOUT.HEADER.ACTIONS.UNBLOCK_ERROR_MESSAGE')
                    : t('CONTACTS_LAYOUT.HEADER.ACTIONS.BLOCK_ERROR_MESSAGE'),
            );
        } finally {
            setUpdating(false);
        }
    };

    return (
        <Dashboard>
            <div className="flex flex-col justify-between flex-1 h-full m-0 overflow-auto bg-n-surface-1">
                <ContactsDetailsLayout
                    selectedContact={selectedContact}
                    isUpdating={isUpdating}
                    onGoToContactsList={goToContactsList}
                    onToggleBlock={toggleContactBlock}
                    sidebarHeader={
                        <div className="px-6 pt-6 pb-3">
                            <TabBar
                                tabs={tabs}
                                initialActiveTab={activeTabIndex}
                                className="w-full [&>button]:w-full bg-n-alpha-black2"
                                onTabChanged={tab => setActiveTab(tab.value)}
                            />
                        </div>
                    }
                    sidebar={
                        isFetchingItem ? (
                            <div className="flex items-center justify-center py-10 text-n-slate-11">
                                <Spinner />
                            </div>
                        ) : (
                            // Nội dung tab chờ feature tương ứng — giữ khung sidebar.
                            <div />
                        )
                    }
                >
                    {isFetchingItem ? (
                        <div className="flex items-center justify-center py-10 text-n-slate-11">
                            <Spinner />
                        </div>
                    ) : selectedContact ? (
                        <ContactDetails
                            selectedContact={selectedContact}
                            onContactUpdated={setSelectedContact}
                            onGoToContactsList={goToContactsList}
                        />
                    ) : null}
                </ContactsDetailsLayout>
            </div>
        </Dashboard>
    );
}
