import { useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { picoSearch } from '@ext/pico-search';
import { ICONS } from 'dashboard/icons';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { deleteJson, getJson, parseApiErrorMessage } from 'dashboard/helper/apiClient';
import Dashboard from '../../Dashboard';
import SettingsWrapper from '../SettingsWrapper';
import SettingsLayout from '../SettingsLayout';
import BaseSettingsHeader from '../BaseSettingsHeader';
import Button from 'dashboard/components-next/button/Button';
import Modal from 'dashboard/components/Modal';
import DeleteModal from 'dashboard/components/widgets/modal/DeleteModal';
import BaseTable from 'dashboard/components-next/table/BaseTable';
import BaseTableRow from 'dashboard/components-next/table/BaseTableRow';
import BaseTableCell from 'dashboard/components-next/table/BaseTableCell';
import AddLabel from './AddLabel';
import EditLabel from './EditLabel';
import type { Label } from './types';
import type { DashboardPageProps } from '../../types';

// Port từ dashboard/routes/dashboard/settings/labels/Index.vue.
// Danh sách lấy qua fetch thay vuex store labels; thứ tự title.localeCompare
// giữ nguyên như action `labels/get`.
const sortByTitle = (labels: Label[]) => [...labels].sort((a, b) => a.title.localeCompare(b.title));

export default function LabelsIndex() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [labels, setLabels] = useState<Label[]>([]);
    const [isFetching, setFetching] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddPopup, setShowAddPopup] = useState(false);
    const [editingLabel, setEditingLabel] = useState<Label | null>(null);
    const [deletingLabel, setDeletingLabel] = useState<Label | null>(null);
    const [deletingIds, setDeletingIds] = useState<number[]>([]);

    useEffect(() => {
        let active = true;

        getJson<{ payload: Label[] }>(`/api/v1/accounts/${accountId}/labels`)
            .then(response => {
                if (active) setLabels(sortByTitle(response.payload));
            })
            .finally(() => {
                if (active) setFetching(false);
            });

        return () => {
            active = false;
        };
    }, [accountId]);

    const filteredLabels = useMemo(() => {
        const query = searchQuery.trim();
        if (!query) return labels;

        return picoSearch(labels, query, [{ name: 'title', weight: 4 }, 'description']);
    }, [labels, searchQuery]);

    const confirmDeletion = async () => {
        const label = deletingLabel;
        if (!label) return;

        setDeletingLabel(null);
        setDeletingIds(current => [...current, label.id]);
        try {
            await deleteJson(`/api/v1/accounts/${accountId}/labels/${label.id}`);
            setLabels(current => current.filter(item => item.id !== label.id));
            useAlert(t('LABEL_MGMT.DELETE.API.SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('LABEL_MGMT.DELETE.API.ERROR_MESSAGE'));
        } finally {
            setDeletingIds(current => current.filter(id => id !== label.id));
        }
    };

    const tableHeaders = [
        t('LABEL_MGMT.LIST.TABLE_HEADER.NAME'),
        t('LABEL_MGMT.LIST.TABLE_HEADER.DESCRIPTION'),
        t('LABEL_MGMT.LIST.TABLE_HEADER.COLOR'),
        t('LABEL_MGMT.LIST.TABLE_HEADER.ACTION'),
    ];

    return (
        <Dashboard>
            <SettingsWrapper>
                <SettingsLayout
                    isLoading={isFetching}
                    loadingMessage={t('LABEL_MGMT.LOADING')}
                    noRecordsFound={!labels.length}
                    noRecordsMessage={t('LABEL_MGMT.LIST.404')}
                    header={
                        <BaseSettingsHeader
                            title={t('LABEL_MGMT.HEADER')}
                            description={t('LABEL_MGMT.DESCRIPTION')}
                            linkText={t('LABEL_MGMT.LEARN_MORE')}
                            featureName="labels"
                            searchPlaceholder={t('LABEL_MGMT.SEARCH_PLACEHOLDER')}
                            searchQuery={searchQuery}
                            onSearchQueryChange={setSearchQuery}
                            count={
                                labels.length ? (
                                    <span className="text-body-main text-n-slate-11">
                                        {t('LABEL_MGMT.COUNT', { n: labels.length })}
                                    </span>
                                ) : null
                            }
                            actions={
                                <Button
                                    label={t('LABEL_MGMT.HEADER_BTN_TXT')}
                                    size="sm"
                                    onClick={() => setShowAddPopup(true)}
                                />
                            }
                        />
                    }
                    body={
                        <BaseTable
                            headers={tableHeaders}
                            hasItems={filteredLabels.length > 0}
                            noDataMessage={
                                searchQuery ? t('LABEL_MGMT.NO_RESULTS') : t('LABEL_MGMT.LIST.404')
                            }
                        >
                            {filteredLabels.map(label => (
                                <BaseTableRow key={label.id}>
                                    <BaseTableCell>
                                        <span className="text-body-main text-n-slate-12">{label.title}</span>
                                    </BaseTableCell>

                                    <BaseTableCell>
                                        <span className="text-body-main text-n-slate-11">
                                            {label.description}
                                        </span>
                                    </BaseTableCell>

                                    <BaseTableCell>
                                        <div className="flex items-center">
                                            <span
                                                className="w-4 h-4 ltr:mr-2 rtl:ml-2 border border-solid rounded border-n-weak"
                                                style={{ backgroundColor: label.color }}
                                            />
                                            <span className="text-body-main text-n-slate-12">
                                                {label.color}
                                            </span>
                                        </div>
                                    </BaseTableCell>

                                    <BaseTableCell align="end">
                                        <div className="flex gap-3 justify-end flex-shrink-0">
                                            <Button
                                                title={t('LABEL_MGMT.FORM.EDIT')}
                                                icon={ICONS.edit}
                                                slate
                                                sm
                                                isLoading={deletingIds.includes(label.id)}
                                                onClick={() => setEditingLabel(label)}
                                            />
                                            <Button
                                                title={t('LABEL_MGMT.FORM.DELETE')}
                                                icon={ICONS.delete}
                                                slate
                                                sm
                                                className="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
                                                isLoading={deletingIds.includes(label.id)}
                                                onClick={() => setDeletingLabel(label)}
                                            />
                                        </div>
                                    </BaseTableCell>
                                </BaseTableRow>
                            ))}
                        </BaseTable>
                    }
                >
                    <Modal show={showAddPopup} onClose={() => setShowAddPopup(false)}>
                        <AddLabel
                            accountId={accountId}
                            onClose={() => setShowAddPopup(false)}
                            onCreated={label => setLabels(current => sortByTitle([...current, label]))}
                        />
                    </Modal>

                    <Modal show={editingLabel !== null} onClose={() => setEditingLabel(null)}>
                        {editingLabel ? (
                            <EditLabel
                                accountId={accountId}
                                label={editingLabel}
                                onClose={() => setEditingLabel(null)}
                                onUpdated={updated =>
                                    setLabels(current =>
                                        sortByTitle(
                                            current.map(item => (item.id === updated.id ? updated : item)),
                                        ),
                                    )
                                }
                            />
                        ) : null}
                    </Modal>

                    <DeleteModal
                        show={deletingLabel !== null}
                        onClose={() => setDeletingLabel(null)}
                        onConfirm={() => void confirmDeletion()}
                        title={t('LABEL_MGMT.DELETE.CONFIRM.TITLE')}
                        message={t('LABEL_MGMT.DELETE.CONFIRM.MESSAGE')}
                        messageValue={` ${deletingLabel?.title ?? ''}?`}
                        confirmText={t('LABEL_MGMT.DELETE.CONFIRM.YES')}
                        rejectText={t('LABEL_MGMT.DELETE.CONFIRM.NO')}
                    />
                </SettingsLayout>
            </SettingsWrapper>
        </Dashboard>
    );
}
