import { useRef, useState } from 'react';

import Button from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { t } from '../../../i18n';
import type { AttributeInputProps } from './types';

// Port từ components-next/CustomAttributes/ListAttribute.vue
export default function ListAttribute({ attribute, isEditingView = false, onUpdate, onDelete }: AttributeInputProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    useClickAway(containerRef, () => setShowDropdown(false), showDropdown);

    const menuItems = (attribute.attributeValues ?? []).map(value => ({
        label: value,
        value,
        action: 'select',
        isSelected: value === attribute.value,
    }));

    return (
        <div
            className={`flex items-center w-full min-w-0 gap-2 ${isEditingView ? 'justify-start' : 'justify-end'}`}
        >
            <div ref={containerRef} className="relative flex items-center">
                <span
                    className={`min-w-0 text-sm ${
                        isEditingView
                            ? 'text-n-slate-12 truncate flex-1'
                            : 'cursor-pointer text-n-slate-11 hover:text-n-slate-12 py-2 select-none font-medium'
                    }`}
                    onClick={() => setShowDropdown(!isEditingView)}
                >
                    {(attribute.value as string) || t('CONTACTS_LAYOUT.SIDEBAR.ATTRIBUTES.TRIGGER.SELECT')}
                </span>
                {showDropdown ? (
                    <DropdownMenu
                        menuItems={menuItems}
                        showSearch
                        className={`w-48 mt-2 top-full ${
                            isEditingView ? 'ltr:left-0 rtl:right-0' : 'ltr:right-0 rtl:left-0'
                        }`}
                        onAction={item => {
                            onUpdate(item.value);
                            setShowDropdown(false);
                        }}
                    />
                ) : null}
            </div>
            {isEditingView ? (
                <div className="flex items-center gap-1">
                    <Button
                        variant="faded"
                        color="slate"
                        icon="i-lucide-pencil"
                        size="xs"
                        className="flex-shrink-0 opacity-0 group-hover/attribute:opacity-100 hover:no-underline"
                        onClick={() => setShowDropdown(current => !current)}
                    />
                    <Button
                        variant="faded"
                        color="ruby"
                        icon="i-lucide-trash"
                        size="xs"
                        className="flex-shrink-0 opacity-0 group-hover/attribute:opacity-100 hover:no-underline"
                        onClick={onDelete}
                    />
                </div>
            ) : null}
        </div>
    );
}
