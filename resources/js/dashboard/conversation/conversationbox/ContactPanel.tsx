import type { ReactNode } from 'react';

import { usePage } from '@inertiajs/react';

import AccordionItem from 'dashboard/components/Accordion/AccordionItem';
import SidebarActionsHeader from 'dashboard/components-next/SidebarActionsHeader';
import { conversationSidebarItemsOrder } from 'dashboard/composables/useUISettings';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import type { ContactMeta } from '../types';
import ContactConversations from './contact/ContactConversations';
import ContactInfo from './contact/ContactInfo';
import ContactNotes from './contact/ContactNotes';
import ConversationAction from './contact/ConversationAction';
import ConversationInfo from './contact/ConversationInfo';
import ConversationParticipant from './contact/ConversationParticipant';
import CustomAttributes from './contact/CustomAttributes';
import SharedFiles from './contact/SharedFiles';
import { useContactDetails } from './contact/useContactDetails';
import MacroList from '../macros/MacroList';

// Port từ routes/dashboard/conversation/ContactPanel.vue — header + ContactInfo
// + các accordion đúng tên/thứ tự gốc (ui_settings conversation_sidebar_items_order
// + cờ is_*_open). linear/shopify (integrations) bỏ; kéo thả
// sắp xếp bỏ.
// Hằng module: nếu dựng object mới mỗi lần render thì useContactDetails sẽ nạp lại vô hạn.
const NO_CONTACT: ContactMeta = { id: 0, name: null };

interface SidebarSection {
    name: string;
    title: string;
    openKey: string;
    compact: boolean;
    body?: ReactNode;
}

export default function ContactPanel() {
    const { selectedConversation, uiSettings, updateUISettings } = useConversation();
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const macrosEnabled = Boolean(currentAccount.features.macros);
    const [contact, setContact] = useContactDetails(
        currentAccount.id,
        selectedConversation?.meta.sender ?? NO_CONTACT,
    );

    if (!selectedConversation) return null;

    const isContactSidebarItemOpen = (key: string) => Boolean(uiSettings[key]);
    const toggleSidebarUIState = (key: string) => updateUISettings({ [key]: !uiSettings[key] });
    const closeContactPanel = () => updateUISettings({ is_contact_sidebar_open: false, is_copilot_panel_open: false });

    const sections: Record<string, SidebarSection | null> = {
        conversation_actions: {
            name: 'conversation_actions',
            title: t('CONVERSATION_SIDEBAR.ACCORDION.CONVERSATION_ACTIONS'),
            openKey: 'is_conv_actions_open',
            compact: false,
            body: <ConversationAction />,
        },
        conversation_participants: {
            name: 'conversation_participants',
            title: t('CONVERSATION_PARTICIPANTS.SIDEBAR_TITLE'),
            openKey: 'is_conv_participants_open',
            compact: false,
            body: <ConversationParticipant />,
        },
        conversation_info: {
            name: 'conversation_info',
            title: t('CONVERSATION_SIDEBAR.ACCORDION.CONVERSATION_INFO'),
            openKey: 'is_conv_details_open',
            compact: true,
            body: (
                <ConversationInfo
                    conversationAttributes={selectedConversation.additional_attributes ?? {}}
                    contactAttributes={contact.additional_attributes ?? {}}
                />
            ),
        },
        contact_attributes: {
            name: 'contact_attributes',
            title: t('CONVERSATION_SIDEBAR.ACCORDION.CONTACT_ATTRIBUTES'),
            openKey: 'is_contact_attributes_open',
            compact: true,
            body: (
                <CustomAttributes
                    attributeType="contact_attribute"
                    attributeFrom="conversation_contact_panel"
                    emptyStateMessage={t('CONVERSATION_CUSTOM_ATTRIBUTES.NO_RECORDS_FOUND')}
                    contactId={contact.id}
                    contactCustomAttributes={contact.custom_attributes}
                    onContactCustomAttributesChange={customAttributes =>
                        setContact(current => ({ ...current, custom_attributes: customAttributes }))
                    }
                />
            ),
        },
        // Bản gốc bọc accordion này trong `v-if="contact.id"`.
        previous_conversation: contact.id
            ? {
                  name: 'previous_conversation',
                  title: t('CONVERSATION_SIDEBAR.ACCORDION.PREVIOUS_CONVERSATION'),
                  openKey: 'is_previous_conv_open',
                  compact: true,
                  body: <ContactConversations contactId={contact.id} />,
              }
            : null,
        macros: macrosEnabled
            ? {
                  name: 'macros',
                  title: t('CONVERSATION_SIDEBAR.ACCORDION.MACROS'),
                  openKey: 'is_macro_open',
                  compact: true,
                  body: <MacroList conversationId={selectedConversation.id} />,
              }
            : null,
        contact_notes: {
            name: 'contact_notes',
            title: t('CONVERSATION_SIDEBAR.ACCORDION.CONTACT_NOTES'),
            openKey: 'is_contact_notes_open',
            compact: true,
            body: contact.id ? <ContactNotes contactId={contact.id} /> : null,
        },
        shared_files: {
            name: 'shared_files',
            title: t('CONVERSATION_SIDEBAR.ACCORDION.SHARED_FILES'),
            openKey: 'is_shared_files_open',
            compact: true,
            body: <SharedFiles />,
        },
        linear_issues: null,
        shopify_orders: null,
    };

    const orderedSections = conversationSidebarItemsOrder(uiSettings)
        .map(item => sections[item.name])
        .filter((section): section is SidebarSection => section !== null && section !== undefined);

    return (
        <div className="w-full">
            <SidebarActionsHeader title={t('CONVERSATION.SIDEBAR.CONTACT')} onClose={closeContactPanel} />
            <ContactInfo
                contact={contact}
                onContactChange={setContact}
                uiSettings={uiSettings}
                onToggleSignature={() =>
                    updateUISettings({ channel_api_signature_enabled: !uiSettings.channel_api_signature_enabled })
                }
                onPanelClose={closeContactPanel}
            />
            <div className="px-2 pb-8 list-group">
                <div className="flex flex-col gap-3">
                    {orderedSections.map(section => (
                        <div
                            key={section.name}
                            className={
                                ['conversation_actions', 'conversation_participants'].includes(section.name)
                                    ? 'conversation--actions'
                                    : undefined
                            }
                        >
                            <AccordionItem
                                title={section.title}
                                compact={section.compact}
                                isOpen={isContactSidebarItemOpen(section.openKey)}
                                onToggle={() => toggleSidebarUIState(section.openKey)}
                            >
                                {section.body}
                            </AccordionItem>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
