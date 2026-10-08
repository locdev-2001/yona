import { isProductFeatureVisible } from 'shared/helpers/productVisibility';
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import Dashboard from '../Dashboard';
import ContactsDetailsLayout from 'dashboard/components-next/Contacts/ContactsDetailsLayout';
import Loader from 'shared/components/loader/Loader';
import ContactDetails from 'dashboard/components-next/Contacts/Pages/ContactDetails';
import TabBar from 'dashboard/components-next/tabbar/TabBar';
import ContactCustomAttributes from 'dashboard/components-next/Contacts/ContactsSidebar/ContactCustomAttributes';
import ContactHistory from 'dashboard/components-next/Contacts/ContactsSidebar/ContactHistory';
import ContactNotes from 'dashboard/components-next/Contacts/ContactsSidebar/ContactNotes';
import ContactMedia from 'dashboard/components-next/Contacts/ContactsSidebar/ContactMedia';
import ContactMerge from 'dashboard/components-next/Contacts/ContactsSidebar/ContactMerge';
import { fetchContact, updateContact } from 'dashboard/contacts/api';
import { mergeContactUpdate, useContactUpdates } from 'dashboard/contacts/contactUpdates';
import type { Contact } from 'dashboard/contacts/types';
import type { DashboardPageProps } from '../types';

// Port từ dashboard/routes/dashboard/contacts/pages/ContactManageView.vue.
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
    const availableTabOptions = CONTACT_TABS_OPTIONS.filter(
        tab => tab.value !== 'attributes' || isProductFeatureVisible('customAttributes'),
    );
    const defaultTab = availableTabOptions[0].value;
    const [activeTab, setActiveTab] = useState(defaultTab);

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

    useContactUpdates(update => setSelectedContact(current => current && mergeContactUpdate(current, update)));

    const tabs = availableTabOptions.map(tab => ({
        label: t(`CONTACTS_LAYOUT.SIDEBAR.TABS.${tab.key}`),
        value: tab.value,
    }));
    const activeTabIndex = availableTabOptions.findIndex(tab => tab.value === activeTab);

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
                                <Loader />
                            </div>
                        ) : activeTab === 'attributes' && isProductFeatureVisible('customAttributes') ? (
                            <ContactCustomAttributes
                                selectedContact={selectedContact}
                                onContactUpdated={setSelectedContact}
                            />
                        ) : activeTab === 'history' ? (
                            <ContactHistory contactId={contactId} selectedContact={selectedContact} />
                        ) : activeTab === 'notes' ? (
                            <ContactNotes contactId={contactId} />
                        ) : activeTab === 'media' ? (
                            <ContactMedia contactId={contactId} />
                        ) : activeTab === 'merge' && selectedContact ? (
                            <ContactMerge
                                selectedContact={selectedContact}
                                onGoToContactsList={goToContactsList}
                                onResetTab={() => setActiveTab(defaultTab)}
                            />
                        ) : (
                            <div />
                        )
                    }
                >
                    {isFetchingItem ? (
                        <div className="flex items-center justify-center py-10 text-n-slate-11">
                            <Loader />
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
