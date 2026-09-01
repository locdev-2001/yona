import { useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import ConfirmContactDeleteDialog from 'dashboard/components-next/Contacts/ContactsForm/ConfirmContactDeleteDialog';
import type { ConfirmContactDeleteDialogHandle } from 'dashboard/components-next/Contacts/ContactsForm/ConfirmContactDeleteDialog';
import type { DashboardPageProps } from '../../../types';

// Port từ dashboard/components-next/Contacts/ContactsCard/ContactDeleteSection.vue
// (Policy administrator = kiểm role trực tiếp từ shared props).
interface ContactDeleteSectionProps {
    contactId: number;
    onDeleted?: () => void;
}

export default function ContactDeleteSection({ contactId, onDeleted }: ContactDeleteSectionProps) {
    const { currentAccount, currentAccountUser } = usePage<DashboardPageProps>().props;
    const [showDeleteSection, setShowDeleteSection] = useState(false);
    const confirmDeleteContactDialogRef = useRef<ConfirmContactDeleteDialogHandle>(null);

    if (currentAccountUser.role !== 'administrator') return null;

    return (
        <>
            <div className="flex flex-col items-start border-t border-n-strong px-6 py-5">
                <Button
                    label={t('CONTACTS_LAYOUT.DETAILS.DELETE_CONTACT')}
                    sm
                    link
                    slate
                    className="hover:!no-underline text-n-slate-12"
                    icon="i-lucide-chevron-down"
                    trailingIcon
                    onClick={() => setShowDeleteSection(current => !current)}
                />

                <div
                    className={`transition-all duration-300 ease-in-out grid w-full overflow-hidden ${
                        showDeleteSection ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 mt-0'
                    }`}
                >
                    <div className="overflow-hidden min-h-0">
                        <span className="inline-flex text-n-slate-11 text-sm items-center gap-1">
                            {t('CONTACTS_LAYOUT.CARD.DELETE_CONTACT.MESSAGE')}
                            <Button
                                label={t('CONTACTS_LAYOUT.CARD.DELETE_CONTACT.BUTTON')}
                                sm
                                ruby
                                link
                                onClick={() => confirmDeleteContactDialogRef.current?.open()}
                            />
                        </span>
                    </div>
                </div>
            </div>
            <ConfirmContactDeleteDialog
                ref={confirmDeleteContactDialogRef}
                accountId={currentAccount.id}
                contactId={contactId}
                onDeleted={onDeleted}
            />
        </>
    );
}
