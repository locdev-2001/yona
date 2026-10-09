import { useCallback, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { ICONS } from 'dashboard/icons';

import Icon from 'dashboard/components-next/icon/Icon';
import NextButton from 'dashboard/components-next/button/Button';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { useLabelsList } from 'dashboard/composables/useLabelsList';
import { labelsForRemoval, toggleLabelSelection } from 'dashboard/conversation/labelHelpers';
import { t } from '../../../../../i18n';
import type { DashboardPageProps } from '../../../../types';
import BulkActionDropdown from './BulkActionDropdown';

// Port từ conversationBulkActions/BulkLabelActions.vue — hai nhánh `type`.
interface BulkLabelActionsProps {
    type?: 'conversation' | 'contact';
    action?: 'assign' | 'remove';
    isLoading?: boolean;
    disabled?: boolean;
    // Nút "gỡ nhãn" chỉ liệt kê nhãn đang gắn trên các hội thoại đang chọn.
    appliedLabels?: string[] | null;
    onApply: (labels: string[]) => void;
}

export default function BulkLabelActions({
    type = 'conversation',
    action = 'assign',
    isLoading = false,
    disabled = false,
    appliedLabels = null,
    onApply,
}: BulkLabelActionsProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const labels = useLabelsList(currentAccount.id);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

    const isRemoveAction = action === 'remove';
    const isTypeContact = type === 'contact';
    const visibleLabels = isRemoveAction ? labelsForRemoval(labels, appliedLabels) : labels;

    const menuItems: DropdownMenuItem[] = visibleLabels.map(label => ({
        action: 'select',
        value: label.title,
        label: label.title,
        color: label.color,
        id: label.id,
        isSelected: selectedLabels.includes(label.title),
    }));

    const handleApply = () => {
        if (!selectedLabels.length) return;
        onApply(selectedLabels);
        setShowDropdown(false);
        setSelectedLabels([]);
    };

    const handleDismiss = useCallback(() => {
        setSelectedLabels([]);
        setShowDropdown(false);
    }, []);

    return (
        <BulkActionDropdown
            icon={isRemoveAction ? ICONS.labelRemove : 'i-lucide-tag'}
            tooltip={
                isRemoveAction
                    ? t('BULK_ACTION.LABELS.REMOVE_LABELS')
                    : t('BULK_ACTION.LABELS.ASSIGN_LABELS')
            }
            isOpen={showDropdown}
            menuItems={menuItems}
            label={
                isTypeContact
                    ? isRemoveAction
                        ? t('CONTACTS_BULK_ACTIONS.REMOVE_LABELS')
                        : t('CONTACTS_BULK_ACTIONS.ASSIGN_LABELS')
                    : ''
            }
            size={isTypeContact ? 'sm' : 'xs'}
            buttonClassName={
                isTypeContact
                    ? '[&>span:nth-child(2)]:hidden md:[&>span:nth-child(2)]:inline w-fit !text-n-blue-11 [&>span]:!text-n-blue-11 !px-2'
                    : ''
            }
            buttonIsLoading={isTypeContact && isLoading}
            disabled={disabled}
            menuClassName={
                isTypeContact
                    ? 'ltr:right-0 rtl:left-0 mb-1 top-10 w-60 max-h-80'
                    : 'ltr:-right-[6.5rem] rtl:-left-[6.5rem] ltr:2xl:right-0 rtl:2xl:left-0 bottom-8 w-60 max-h-80'
            }
            showSearch
            searchPlaceholder={t('BULK_ACTION.SEARCH_INPUT_PLACEHOLDER')}
            renderThumbnail={item => (
                <span
                    className="rounded-md h-3 w-3 flex-shrink-0 border border-solid border-n-weak"
                    style={{ backgroundColor: item.color as string }}
                />
            )}
            renderTrailingIcon={item =>
                selectedLabels.includes(item.value as string) ? (
                    <Icon icon="i-lucide-check" className="size-4 text-n-blue-11 flex-shrink-0" />
                ) : null
            }
            footer={
                <div className="sticky bottom-0 rounded-b-md px-2 py-2 z-20 bg-n-surface-raised">
                    <NextButton
                        sm
                        className="w-full [&>span:nth-child(2)]:hidden md:[&>span:nth-child(2)]:inline-flex"
                        label={
                            isRemoveAction
                                ? t('BULK_ACTION.LABELS.REMOVE_SELECTED_LABELS')
                                : t('BULK_ACTION.LABELS.ASSIGN_SELECTED_LABELS')
                        }
                        disabled={!selectedLabels.length}
                        onClick={handleApply}
                    />
                </div>
            }
            onToggle={() => setShowDropdown(open => !open)}
            onDismiss={handleDismiss}
            onAction={item => setSelectedLabels(current => toggleLabelSelection(current, item.value as string))}
        />
    );
}
