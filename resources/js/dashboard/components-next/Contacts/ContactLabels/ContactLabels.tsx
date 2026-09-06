import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import AddLabel from 'dashboard/components-next/label/AddLabel';
import LabelItem from 'dashboard/components-next/label/LabelItem';
import type { ContactLabel } from 'dashboard/components-next/label/LabelItem';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { useLabelsList } from 'dashboard/composables/useLabelsList';
import { getJson, postJson } from 'dashboard/helper/apiClient';
import type { DashboardPageProps } from '../../../types';

// Port từ dashboard/components-next/Contacts/ContactLabels/ContactLabels.vue —
// store contactLabels thay bằng GET/POST /contacts/{id}/labels tại chỗ.
interface ContactLabelsProps {
    contactId?: number | null;
}

export default function ContactLabels({ contactId = null }: ContactLabelsProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const allLabels = useLabelsList(accountId) as unknown as ContactLabel[];

    const [contactLabelTitles, setContactLabelTitles] = useState<string[]>([]);
    const [hoveredLabel, setHoveredLabel] = useState<number | null>(null);

    useEffect(() => {
        if (!contactId) return undefined;

        let cancelled = false;
        getJson<{ payload: string[] }>(`/api/v1/accounts/${accountId}/contacts/${contactId}/labels`)
            .catch(() => ({ payload: [] as string[] }))
            .then(response => {
                if (!cancelled) setContactLabelTitles(response.payload ?? []);
            });

        return () => {
            cancelled = true;
        };
    }, [accountId, contactId]);

    const savedLabels = allLabels.filter(({ title }) => contactLabelTitles.includes(title));

    const labelMenuItems: DropdownMenuItem[] = allLabels
        .map(label => ({
            label: label.title,
            value: label.id,
            thumbnail: { name: label.title, color: label.color } as unknown as DropdownMenuItem['thumbnail'],
            isSelected: savedLabels.some(savedLabel => savedLabel.id === label.id),
            action: 'contactLabel',
        }))
        .sort((a, b) => Number(a.isSelected) - Number(b.isSelected));

    const handleLabelAction = async (value: number | string) => {
        if (!contactId) return;

        const selectedLabel = allLabels.find(label => label.id === Number(value));
        if (!selectedLabel) return;

        const updatedLabels = contactLabelTitles.includes(selectedLabel.title)
            ? contactLabelTitles.filter(title => title !== selectedLabel.title)
            : [...contactLabelTitles, selectedLabel.title];

        const response = await postJson<{ payload: string[] }>(
            `/api/v1/accounts/${accountId}/contacts/${contactId}/labels`,
            { labels: updatedLabels },
        );
        setContactLabelTitles(response.payload ?? updatedLabels);
    };

    return (
        <div className="flex flex-wrap items-center gap-2" onMouseLeave={() => setHoveredLabel(null)}>
            {savedLabels.map(label => (
                <LabelItem
                    key={label.id}
                    label={label}
                    isHovered={hoveredLabel === label.id}
                    onRemove={removed => void handleLabelAction(removed.id)}
                    onHover={setHoveredLabel}
                />
            ))}
            <AddLabel labelMenuItems={labelMenuItems} onUpdateLabel={item => void handleLabelAction(item.value)} />
        </div>
    );
}
