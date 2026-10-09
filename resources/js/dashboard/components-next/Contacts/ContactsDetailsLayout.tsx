import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import Breadcrumb from 'dashboard/components-next/breadcrumb/Breadcrumb';
import type { Contact } from 'dashboard/contacts/types';

// Port từ dashboard/components-next/Contacts/ContactsDetailsLayout.vue.
// Khác biệt cố ý: VoiceCallButton (voice = EE) không render — khớp oracle
// khi không có voice inbox; nút "Send message" giữ chỗ (ComposeConversation B3).
interface ContactsDetailsLayoutProps {
    selectedContact?: Contact | null;
    isUpdating?: boolean;
    children: ReactNode;
    sidebarHeader?: ReactNode;
    sidebar?: ReactNode;
    onGoToContactsList: () => void;
    onToggleBlock: (isBlocked: boolean) => void;
}

export default function ContactsDetailsLayout({
    selectedContact = null,
    isUpdating = false,
    children,
    sidebarHeader,
    sidebar,
    onGoToContactsList,
    onToggleBlock,
}: ContactsDetailsLayoutProps) {
    const [isContactSidebarOpen, setContactSidebarOpen] = useState(false);
    const sidebarContentRef = useRef<HTMLDivElement>(null);
    const toggleRef = useRef<HTMLDivElement>(null);

    // v-on-click-outside (ignore nội dung sidebar) của bản gốc.
    useEffect(() => {
        if (!isContactSidebarOpen) return undefined;

        const handleClickAway = (event: MouseEvent) => {
            const target = event.target as Node;
            if (sidebarContentRef.current?.contains(target) || toggleRef.current?.contains(target)) return;
            setContactSidebarOpen(false);
        };
        document.addEventListener('mousedown', handleClickAway);

        return () => document.removeEventListener('mousedown', handleClickAway);
    }, [isContactSidebarOpen]);

    const breadcrumbItems = [
        { label: t('CONTACTS_LAYOUT.HEADER.BREADCRUMB.CONTACTS'), link: '#' },
        ...(selectedContact ? [{ label: selectedContact.name }] : []),
    ];

    const isContactBlocked = Boolean(selectedContact?.blocked);

    return (
        <section className="flex w-full h-full overflow-hidden justify-evenly bg-n-surface-1">
            <div className="flex flex-col w-full h-full transition-all duration-300 ltr:2xl:ml-56 rtl:2xl:mr-56">
                <header className="sticky top-0 z-10 px-6 3xl:px-0">
                    <div className="w-full mx-auto max-w-[40.625rem]">
                        <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between w-full py-7 gap-2">
                            <Breadcrumb items={breadcrumbItems} onClick={onGoToContactsList} />
                            <div className="flex items-center gap-2">
                                <Button
                                    label={
                                        !isContactBlocked
                                            ? t('CONTACTS_LAYOUT.HEADER.BLOCK_CONTACT')
                                            : t('CONTACTS_LAYOUT.HEADER.UNBLOCK_CONTACT')
                                    }
                                    size="sm"
                                    slate
                                    isLoading={isUpdating}
                                    disabled={isUpdating}
                                    onClick={() => onToggleBlock(isContactBlocked)}
                                />
                                <Button label={t('CONTACTS_LAYOUT.HEADER.SEND_MESSAGE')} size="sm" />
                            </div>
                        </div>
                    </div>
                </header>
                <main className="flex-1 px-6 overflow-y-auto 3xl:px-px">
                    <div className="w-full py-4 mx-auto max-w-[40.625rem]">{children}</div>
                </main>
            </div>

            {/* Sidebar desktop */}
            {sidebar ? (
                <div className="hidden lg:flex flex-col min-w-52 w-full max-w-md bg-n-surface-panel">
                    <div className="shrink-0">{sidebarHeader}</div>
                    <div className="flex-1 min-h-0 overflow-y-auto pb-6 pt-3">{sidebar}</div>
                </div>
            ) : null}

            {/* Sidebar mobile */}
            {sidebar ? (
                <div
                    className={`lg:hidden fixed top-0 ltr:right-0 rtl:left-0 h-full z-50 flex justify-end transition-all duration-200 ease-in-out ${
                        isContactSidebarOpen ? 'w-full' : 'w-16'
                    }`}
                >
                    <div
                        ref={toggleRef}
                        className={`flex items-start p-1 w-fit h-fit relative order-1 xs:top-24 top-28 transition-all overlay-surface duration-500 ease-in-out ${
                            isContactSidebarOpen
                                ? 'justify-end ltr:rounded-l-full rtl:rounded-r-full ltr:rounded-r-none rtl:rounded-l-none'
                                : 'justify-center rounded-full ltr:mr-6 rtl:ml-6'
                        }`}
                    >
                        <Button
                            ghost
                            slate
                            sm
                            className={`!rounded-full rtl:rotate-180 ${isContactSidebarOpen ? 'bg-n-alpha-2' : ''}`.trim()}
                            icon={
                                isContactSidebarOpen ? 'i-lucide-panel-right-close' : 'i-lucide-panel-right-open'
                            }
                            onClick={() => setContactSidebarOpen(open => !open)}
                        />
                    </div>

                    {isContactSidebarOpen ? (
                        <div
                            ref={sidebarContentRef}
                            id="contact-sidebar-content"
                            className="order-2 w-[85%] sm:w-[50%] flex flex-col overlay-surface"
                        >
                            <div className="shrink-0">{sidebarHeader}</div>
                            <div className="flex-1 min-h-0 overflow-y-auto pb-6 pt-3">{sidebar}</div>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </section>
    );
}
