import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import BulkSelectBar from 'dashboard/components-next/captain/assistant/BulkSelectBar';
import Button from 'dashboard/components-next/button/Button';
import BulkLabelActions from 'dashboard/components/widgets/conversation/conversationBulkActions/BulkLabelActions';
import type { DashboardPageProps } from '../../types';

// Port từ routes/dashboard/contacts/components/ContactsBulkActionBar.vue.
interface ContactsBulkActionBarProps {
    visibleContactIds: number[];
    selectedContactIds: number[];
    isLoading?: boolean;
    onToggleAll: (shouldSelect: boolean) => void;
    onClearSelection: () => void;
    onAssignLabels: (labels: string[]) => void;
    onRemoveLabels: (labels: string[]) => void;
    onDeleteSelected: () => void;
}

export default function ContactsBulkActionBar({
    visibleContactIds,
    selectedContactIds,
    isLoading = false,
    onToggleAll,
    onClearSelection,
    onAssignLabels,
    onRemoveLabels,
    onDeleteSelected,
}: ContactsBulkActionBarProps) {
    const { currentAccountUser } = usePage<DashboardPageProps>().props;
    const isAdministrator = currentAccountUser?.role === 'administrator';

    const selectedCount = selectedContactIds.length;
    const totalVisibleContacts = visibleContactIds.length;
    const selectAllLabel = totalVisibleContacts
        ? t('CONTACTS_BULK_ACTIONS.SELECT_ALL', { count: totalVisibleContacts })
        : '';

    return (
        <div className="sticky top-0 z-10 bg-gradient-to-b from-n-surface-1 from-90% to-transparent pt-1 pb-2">
            <BulkSelectBar
                selectedIds={new Set(selectedContactIds)}
                allItems={visibleContactIds.map(id => ({ id }))}
                selectAllLabel={selectAllLabel}
                selectedCountLabel={t('CONTACTS_BULK_ACTIONS.SELECTED_COUNT', { count: selectedCount })}
                className="py-2 ltr:!pr-3 rtl:!pl-3 justify-between"
                primaryActions={
                    <Button
                        sm
                        ghost
                        slate
                        label={t('CONTACTS_BULK_ACTIONS.CLEAR_SELECTION')}
                        className="!px-1"
                        onClick={onClearSelection}
                    />
                }
                actions={
                    <div className="flex items-center gap-2 ml-auto">
                        <BulkLabelActions
                            type="contact"
                            isLoading={isLoading}
                            disabled={!selectedCount}
                            onApply={onAssignLabels}
                        />
                        <BulkLabelActions
                            type="contact"
                            action="remove"
                            isLoading={isLoading}
                            disabled={!selectedCount}
                            onApply={onRemoveLabels}
                        />
                        <div className="w-px h-3 bg-n-weak rounded-lg" />
                        {isAdministrator ? (
                            <Button
                                title={t('CONTACTS_BULK_ACTIONS.DELETE_CONTACTS')}
                                sm
                                ghost
                                ruby
                                icon="i-lucide-trash"
                                label={t('CONTACTS_BULK_ACTIONS.DELETE_CONTACTS')}
                                aria-label={t('CONTACTS_BULK_ACTIONS.DELETE_CONTACTS')}
                                disabled={!selectedCount || isLoading}
                                isLoading={isLoading}
                                className="!px-2 [&>span:nth-child(2)]:hidden md:[&>span:nth-child(2)]:inline-flex"
                                onClick={onDeleteSelected}
                            />
                        ) : null}
                    </div>
                }
                onChange={selectedIds => {
                    if (!visibleContactIds.length) {
                        onToggleAll(false);
                        return;
                    }
                    onToggleAll(visibleContactIds.every(id => selectedIds.has(id)));
                }}
            />
        </div>
    );
}
