import { useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DashboardPageProps } from '../../../../types';

// Port từ dashboard/components-next/Contacts/ContactsHeader/components/ContactMoreActions.vue.
interface ContactMoreActionsProps {
    onAdd: () => void;
    onImport: () => void;
    onExport: () => void;
}

export default function ContactMoreActions({ onAdd, onImport, onExport }: ContactMoreActionsProps) {
    const { currentAccountUser } = usePage<DashboardPageProps>().props;
    // checkPermissions(['administrator', 'contact_manage']) — contact_manage là
    // custom role (EE) nên chỉ còn administrator.
    const canManageContacts = currentAccountUser?.role === 'administrator';
    const [showActionsDropdown, setShowActionsDropdown] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showActionsDropdown) return undefined;

        const handleClickAway = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setShowActionsDropdown(false);
        };
        document.addEventListener('mousedown', handleClickAway);

        return () => document.removeEventListener('mousedown', handleClickAway);
    }, [showActionsDropdown]);

    const contactMenuItems = [
        {
            label: t('CONTACTS_LAYOUT.HEADER.ACTIONS.CONTACT_CREATION.ADD_CONTACT'),
            action: 'add',
            value: 'add',
            icon: 'i-lucide-plus',
        },
        ...(canManageContacts
            ? [
                  {
                      label: t('CONTACTS_LAYOUT.HEADER.ACTIONS.CONTACT_CREATION.EXPORT_CONTACT'),
                      action: 'export',
                      value: 'export',
                      icon: 'i-lucide-upload',
                  },
                  {
                      label: t('CONTACTS_LAYOUT.HEADER.ACTIONS.CONTACT_CREATION.IMPORT_CONTACT'),
                      action: 'import',
                      value: 'import',
                      icon: 'i-lucide-download',
                  },
              ]
            : []),
    ];

    return (
        <div ref={rootRef} className="relative">
            <Button
                icon="i-lucide-ellipsis-vertical"
                color="slate"
                variant="ghost"
                size="sm"
                className={showActionsDropdown ? 'bg-n-alpha-2' : ''}
                onClick={() => setShowActionsDropdown(open => !open)}
            />
            {showActionsDropdown ? (
                <DropdownMenu
                    menuItems={contactMenuItems}
                    className="ltr:right-0 rtl:left-0 mt-1 w-52 top-full"
                    // handleContactAction gốc KHÔNG đóng menu — chỉ clickaway đóng.
                    // Dialog modal chặn pointer nên menu nằm nguyên sau backdrop
                    // khi "Add contact" mở dialog (khớp oracle, finding pixel-diff).
                    onAction={item => {
                        if (item.action === 'add') onAdd();
                        else if (item.action === 'import') onImport();
                        else if (item.action === 'export') onExport();
                    }}
                />
            ) : null}
        </div>
    );
}
