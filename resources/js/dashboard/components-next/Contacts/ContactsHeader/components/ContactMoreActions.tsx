import { useEffect, useRef, useState } from 'react';

import { t } from '../../../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';

// Port từ dashboard/components-next/Contacts/ContactsHeader/components/ContactMoreActions.vue.
// Import/Export CSV thuộc nhóm C — menu B2 chỉ còn mục "New contact"
// (khác biệt cố ý, ghi trong trace).
interface ContactMoreActionsProps {
    onAdd: () => void;
}

export default function ContactMoreActions({ onAdd }: ContactMoreActionsProps) {
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
                    onAction={item => {
                        if (item.action === 'add') onAdd();
                        setShowActionsDropdown(false);
                    }}
                />
            ) : null}
        </div>
    );
}
