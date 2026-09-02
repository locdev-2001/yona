import { usePage } from '@inertiajs/react';

import AccordionItem from 'dashboard/components/Accordion/AccordionItem';
import SidebarActionsHeader from 'dashboard/components-next/SidebarActionsHeader';
import { conversationSidebarItemsOrder } from 'dashboard/composables/useUISettings';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import ContactInfo from './contact/ContactInfo';

// Port từ routes/dashboard/conversation/ContactPanel.vue — shell panel: header
// + ContactInfo + các accordion đúng tên/thứ tự gốc (ui_settings
// conversation_sidebar_items_order + cờ is_*_open). Nội dung từng section thuộc
// nhóm sau (ConversationAction B5/B6, Macros D3, ConversationInfo/CustomAttributes
// E1, ContactNotes B2+, SharedFiles B9, ContactConversations, Participants B11)
// → thân rỗng; linear/shopify (integrations) bỏ; kéo thả sắp xếp bỏ.
interface SidebarSection {
    name: string;
    title: string;
    openKey: string;
    compact: boolean;
}

export default function ContactPanel() {
    const { selectedConversation, uiSettings, updateUISettings } = useConversation();
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const macrosEnabled = Boolean(currentAccount.features.macros);

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
        },
        conversation_participants: {
            name: 'conversation_participants',
            title: t('CONVERSATION_PARTICIPANTS.SIDEBAR_TITLE'),
            openKey: 'is_conv_participants_open',
            compact: false,
        },
        conversation_info: {
            name: 'conversation_info',
            title: t('CONVERSATION_SIDEBAR.ACCORDION.CONVERSATION_INFO'),
            openKey: 'is_conv_details_open',
            compact: true,
        },
        contact_attributes: {
            name: 'contact_attributes',
            title: t('CONVERSATION_SIDEBAR.ACCORDION.CONTACT_ATTRIBUTES'),
            openKey: 'is_contact_attributes_open',
            compact: true,
        },
        previous_conversation: {
            name: 'previous_conversation',
            title: t('CONVERSATION_SIDEBAR.ACCORDION.PREVIOUS_CONVERSATION'),
            openKey: 'is_previous_conv_open',
            compact: true,
        },
        macros: macrosEnabled
            ? {
                  name: 'macros',
                  title: t('CONVERSATION_SIDEBAR.ACCORDION.MACROS'),
                  openKey: 'is_macro_open',
                  compact: true,
              }
            : null,
        contact_notes: {
            name: 'contact_notes',
            title: t('CONVERSATION_SIDEBAR.ACCORDION.CONTACT_NOTES'),
            openKey: 'is_contact_notes_open',
            compact: true,
        },
        shared_files: {
            name: 'shared_files',
            title: t('CONVERSATION_SIDEBAR.ACCORDION.SHARED_FILES'),
            openKey: 'is_shared_files_open',
            compact: true,
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
                contact={selectedConversation.meta.sender}
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
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
