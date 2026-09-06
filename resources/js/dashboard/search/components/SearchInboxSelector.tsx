import { useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useClickAway } from 'dashboard/composables/useClickAway';
import Button from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DashboardPageProps } from '../../types';

// Port từ dashboard/modules/search/components/SearchInboxSelector.vue.
interface SearchInboxSelectorProps {
    label: string;
    value: number | null;
    onChange: (inboxId: number | null) => void;
}

export default function SearchInboxSelector({ label, value, onChange }: SearchInboxSelectorProps) {
    const { inboxes = [] } = usePage<DashboardPageProps>().props;
    const container = useRef<HTMLDivElement>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    useClickAway(container, () => setShowDropdown(false));

    const selected = inboxes.find(inbox => inbox.id === value);
    const selectedLabel = value ? `${label}: ${selected?.name ?? value}` : label;

    return (
        <div ref={container} className="relative flex items-center group min-w-0 max-w-full">
            <Button
                sm
                slate
                variant={showDropdown ? 'faded' : 'ghost'}
                label={selectedLabel}
                trailingIcon
                icon="i-lucide-chevron-down"
                className="!px-2 max-w-full"
                onClick={() => setShowDropdown(open => !open)}
            />
            {showDropdown ? (
                <DropdownMenu
                    className="mt-1 ltr:right-0 rtl:left-0 top-full w-64 max-h-80"
                    showSearch
                    menuSections={[
                        {
                            title: t('SEARCH.FILTERS.INBOXES'),
                            emptyState: t('SEARCH.FILTERS.NO_INBOXES'),
                            items: inboxes.map(inbox => ({
                                label: inbox.name,
                                value: inbox.id,
                                action: 'select',
                                thumbnail: { name: inbox.name, src: '' },
                                isSelected: value === inbox.id,
                            })),
                        },
                    ]}
                    onAction={item => {
                        onChange(value === item.value ? null : Number(item.value));
                        setShowDropdown(false);
                    }}
                />
            ) : null}
        </div>
    );
}
