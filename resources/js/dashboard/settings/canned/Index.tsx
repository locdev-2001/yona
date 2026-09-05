import { useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import {
    deleteCannedResponse,
    searchCannedResponses,
    sortCannedResponses,
    useCannedResponses,
} from 'dashboard/composables/useCannedResponses';
import type { CannedResponse, CannedSortOrder } from 'dashboard/composables/useCannedResponses';
import { getPlainText } from 'shared/helpers/MessageFormatter';
import Dashboard from '../../Dashboard';
import SettingsWrapper from '../SettingsWrapper';
import SettingsLayout from '../SettingsLayout';
import BaseSettingsHeader from '../BaseSettingsHeader';
import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import Modal from 'dashboard/components/Modal';
import DeleteModal from 'dashboard/components/widgets/modal/DeleteModal';
import BaseTable from 'dashboard/components-next/table/BaseTable';
import BaseTableRow from 'dashboard/components-next/table/BaseTableRow';
import BaseTableCell from 'dashboard/components-next/table/BaseTableCell';
import AddCanned from './AddCanned';
import EditCanned from './EditCanned';
import type { DashboardPageProps } from '../../types';

// Port từ dashboard/routes/dashboard/settings/canned/Index.vue.
// Danh sách + CRUD đi qua composables/useCannedResponses (thay store vuex
// `cannedResponse`) nên popup `/` trong ReplyBox dùng chung một nguồn.
export default function CannedIndex() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const { records: allRecords, isFetching } = useCannedResponses(accountId);
    const [sortOrder, setSortOrder] = useState<CannedSortOrder>('asc');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddPopup, setShowAddPopup] = useState(false);
    const [editingRecord, setEditingRecord] = useState<CannedResponse | null>(null);
    const [deletingRecord, setDeletingRecord] = useState<CannedResponse | null>(null);
    const [deletingIds, setDeletingIds] = useState<number[]>([]);

    const records = useMemo(() => sortCannedResponses(allRecords, sortOrder), [allRecords, sortOrder]);
    const filteredRecords = useMemo(() => searchCannedResponses(records, searchQuery), [records, searchQuery]);

    const confirmDeletion = async () => {
        const record = deletingRecord;
        if (!record) return;

        setDeletingRecord(null);
        setDeletingIds(current => [...current, record.id]);
        try {
            await deleteCannedResponse(accountId, record.id);
            useAlert(t('CANNED_MGMT.DELETE.API.SUCCESS_MESSAGE'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('CANNED_MGMT.DELETE.API.ERROR_MESSAGE'));
        } finally {
            setDeletingIds(current => current.filter(id => id !== record.id));
        }
    };

    const tableHeaders = [
        t('CANNED_MGMT.LIST.TABLE_HEADER.SHORT_CODE'),
        t('CANNED_MGMT.LIST.TABLE_HEADER.ACTIONS'),
    ];

    return (
        <Dashboard>
            <SettingsWrapper>
                <SettingsLayout
                    isLoading={isFetching}
                    loadingMessage={t('CANNED_MGMT.LOADING')}
                    noRecordsFound={!records.length}
                    noRecordsMessage={t('CANNED_MGMT.LIST.404')}
                    header={
                        <BaseSettingsHeader
                            title={t('CANNED_MGMT.HEADER')}
                            description={t('CANNED_MGMT.DESCRIPTION')}
                            linkText={t('CANNED_MGMT.LEARN_MORE')}
                            featureName="canned_responses"
                            searchPlaceholder={t('CANNED_MGMT.SEARCH_PLACEHOLDER')}
                            searchQuery={searchQuery}
                            onSearchQueryChange={setSearchQuery}
                            count={
                                records.length ? (
                                    <span className="text-body-main text-n-slate-11">
                                        {t('CANNED_MGMT.COUNT', { n: records.length })}
                                    </span>
                                ) : null
                            }
                            actions={
                                <Button
                                    label={t('CANNED_MGMT.HEADER_BTN_TXT')}
                                    size="sm"
                                    onClick={() => setShowAddPopup(true)}
                                />
                            }
                        />
                    }
                    body={
                        <BaseTable
                            headers={[
                                <button
                                    key="short-code"
                                    className="flex items-center gap-2 p-0 cursor-pointer"
                                    onClick={() => setSortOrder(current => (current === 'asc' ? 'desc' : 'asc'))}
                                >
                                    <span className="mb-0">{tableHeaders[0]}</span>
                                    <Icon
                                        className="size-5 text-n-slate-11 flex-shrink-0"
                                        icon={
                                            sortOrder === 'desc'
                                                ? 'i-woot-sort-descending'
                                                : 'i-woot-sort-ascending'
                                        }
                                    />
                                </button>,
                                tableHeaders[1],
                            ]}
                            hasItems={filteredRecords.length > 0}
                            noDataMessage={
                                !records.length
                                    ? t('CANNED_MGMT.LIST.404')
                                    : searchQuery
                                      ? t('CANNED_MGMT.NO_RESULTS')
                                      : ''
                            }
                        >
                            {filteredRecords.map(record => (
                                <BaseTableRow key={record.short_code}>
                                    <BaseTableCell className="max-w-0">
                                        <div className="flex flex-col gap-2 min-w-0">
                                            <span className="text-heading-3 text-n-slate-12 truncate block">
                                                {record.short_code}
                                            </span>
                                            <p className="text-body-main text-n-slate-11 line-clamp-5">
                                                {getPlainText(record.content)}
                                            </p>
                                        </div>
                                    </BaseTableCell>

                                    <BaseTableCell align="end" className="w-24">
                                        <div className="flex gap-3 justify-end flex-shrink-0">
                                            <Button
                                                title={t('CANNED_MGMT.EDIT.BUTTON_TEXT')}
                                                icon="i-woot-edit-pen"
                                                slate
                                                sm
                                                onClick={() => setEditingRecord(record)}
                                            />
                                            <Button
                                                title={t('CANNED_MGMT.DELETE.BUTTON_TEXT')}
                                                icon="i-woot-bin"
                                                slate
                                                sm
                                                className="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
                                                isLoading={deletingIds.includes(record.id)}
                                                onClick={() => setDeletingRecord(record)}
                                            />
                                        </div>
                                    </BaseTableCell>
                                </BaseTableRow>
                            ))}
                        </BaseTable>
                    }
                >
                    <Modal show={showAddPopup} onClose={() => setShowAddPopup(false)}>
                        <AddCanned
                            accountId={accountId}
                            onClose={() => setShowAddPopup(false)}
                            onCreated={() => setShowAddPopup(false)}
                        />
                    </Modal>

                    <Modal show={editingRecord !== null} onClose={() => setEditingRecord(null)}>
                        {editingRecord ? (
                            <EditCanned
                                accountId={accountId}
                                record={editingRecord}
                                onClose={() => setEditingRecord(null)}
                                onUpdated={() => setEditingRecord(null)}
                            />
                        ) : null}
                    </Modal>

                    <DeleteModal
                        show={deletingRecord !== null}
                        onClose={() => setDeletingRecord(null)}
                        onConfirm={() => void confirmDeletion()}
                        title={t('CANNED_MGMT.DELETE.CONFIRM.TITLE')}
                        message={t('CANNED_MGMT.DELETE.CONFIRM.MESSAGE')}
                        messageValue={` ${deletingRecord?.short_code ?? ''} ? `}
                        confirmText={`${t('CANNED_MGMT.DELETE.CONFIRM.YES')} ${deletingRecord?.short_code ?? ''}`}
                        rejectText={`${t('CANNED_MGMT.DELETE.CONFIRM.NO')} ${deletingRecord?.short_code ?? ''}`}
                    />
                </SettingsLayout>
            </SettingsWrapper>
        </Dashboard>
    );
}
