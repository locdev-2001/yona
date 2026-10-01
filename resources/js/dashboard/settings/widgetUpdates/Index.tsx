import { useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { picoSearch } from '@ext/pico-search';
import { ICONS } from 'dashboard/icons';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
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
import AddWidgetUpdate from './AddWidgetUpdate';
import EditWidgetUpdate from './EditWidgetUpdate';
import { deleteWidgetUpdate, fetchWidgetUpdates, publishWidgetUpdate, unpublishWidgetUpdate } from './api';
import type { WidgetUpdate, WidgetUpdateTag } from './types';
import type { DashboardPageProps } from '../../types';

// Trang cài đặt "Bài cập nhật trên widget" — copy đúng khung của
// settings/labels/Index.tsx (fetch tại màn, không qua vuex store).

const TAG_LABEL_KEY: Record<WidgetUpdateTag, string> = {
    promo: 'WIDGET.UPDATES.TAG.PROMO',
    new: 'WIDGET.UPDATES.TAG.NEW',
    notice: 'WIDGET.UPDATES.TAG.NOTICE',
};

const TAG_TONE: Record<WidgetUpdateTag, string> = {
    promo: 'bg-n-ruby-9/10 text-n-ruby-11',
    new: 'bg-n-teal-9/10 text-n-teal-11',
    notice: 'bg-n-slate-9/10 text-n-slate-12',
};

const formatDate = (unixSeconds: number) => new Intl.DateTimeFormat('vi-VN').format(new Date(unixSeconds * 1000));

// Modal mặc định 37.5rem, form có thêm cột xem trước nên cần rộng hơn hẳn.
const FORM_MODAL_SIZE = '!w-[64rem] !max-w-[95vw]';

export default function WidgetUpdatesIndex() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const [updates, setUpdates] = useState<WidgetUpdate[]>([]);
    const [isFetching, setFetching] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [isLoadingMore, setLoadingMore] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddPopup, setShowAddPopup] = useState(false);
    const [editingUpdate, setEditingUpdate] = useState<WidgetUpdate | null>(null);
    const [deletingUpdate, setDeletingUpdate] = useState<WidgetUpdate | null>(null);
    const [pendingIds, setPendingIds] = useState<number[]>([]);

    useEffect(() => {
        let active = true;

        fetchWidgetUpdates(accountId, 1)
            .then(response => {
                if (!active) return;
                setUpdates(response.payload);
                setHasMore(response.meta.has_more);
                setPage(1);
            })
            .finally(() => {
                if (active) setFetching(false);
            });

        return () => {
            active = false;
        };
    }, [accountId]);

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const response = await fetchWidgetUpdates(accountId, page + 1);
            setUpdates(current => [...current, ...response.payload]);
            setHasMore(response.meta.has_more);
            setPage(current => current + 1);
        } finally {
            setLoadingMore(false);
        }
    };

    const filteredUpdates = useMemo(() => {
        const query = searchQuery.trim();
        if (!query) return updates;

        return picoSearch(updates, query, [{ name: 'title', weight: 4 }]);
    }, [updates, searchQuery]);

    const withPending = async (id: number, action: () => Promise<void>) => {
        setPendingIds(current => [...current, id]);
        try {
            await action();
        } finally {
            setPendingIds(current => current.filter(pendingId => pendingId !== id));
        }
    };

    const togglePublish = (update: WidgetUpdate) =>
        withPending(update.id, async () => {
            try {
                const saved = update.published
                    ? await unpublishWidgetUpdate(accountId, update.id)
                    : await publishWidgetUpdate(accountId, update.id);
                setUpdates(current => current.map(item => (item.id === saved.id ? saved : item)));
                useAlert(
                    update.published
                        ? t('WIDGET_UPDATES_MGMT.UNPUBLISH.API.SUCCESS_MESSAGE')
                        : t('WIDGET_UPDATES_MGMT.PUBLISH.API.SUCCESS_MESSAGE'),
                );
            } catch (error) {
                useAlert(
                    parseApiErrorMessage(error) ||
                        t(update.published ? 'WIDGET_UPDATES_MGMT.UNPUBLISH.API.ERROR_MESSAGE' : 'WIDGET_UPDATES_MGMT.PUBLISH.API.ERROR_MESSAGE'),
                );
            }
        });

    const confirmDeletion = async () => {
        const update = deletingUpdate;
        if (!update) return;

        setDeletingUpdate(null);
        await withPending(update.id, async () => {
            try {
                await deleteWidgetUpdate(accountId, update.id);
                setUpdates(current => current.filter(item => item.id !== update.id));
                useAlert(t('WIDGET_UPDATES_MGMT.DELETE.API.SUCCESS_MESSAGE'));
            } catch (error) {
                useAlert(parseApiErrorMessage(error) || t('WIDGET_UPDATES_MGMT.DELETE.API.ERROR_MESSAGE'));
            }
        });
    };

    const tableHeaders = [
        t('WIDGET_UPDATES_MGMT.LIST.TABLE_HEADER.COVER'),
        t('WIDGET_UPDATES_MGMT.LIST.TABLE_HEADER.TITLE'),
        t('WIDGET_UPDATES_MGMT.LIST.TABLE_HEADER.TAG'),
        t('WIDGET_UPDATES_MGMT.LIST.TABLE_HEADER.INBOX'),
        t('WIDGET_UPDATES_MGMT.LIST.TABLE_HEADER.STATUS'),
        t('WIDGET_UPDATES_MGMT.LIST.TABLE_HEADER.ACTION'),
    ];

    return (
        <Dashboard>
            <SettingsWrapper>
                <SettingsLayout
                    isLoading={isFetching}
                    loadingMessage={t('WIDGET_UPDATES_MGMT.LOADING')}
                    noRecordsFound={!updates.length}
                    noRecordsMessage={t('WIDGET_UPDATES_MGMT.LIST.404')}
                    header={
                        <BaseSettingsHeader
                            title={t('WIDGET_UPDATES_MGMT.HEADER')}
                            description={t('WIDGET_UPDATES_MGMT.DESCRIPTION')}
                            searchPlaceholder={t('WIDGET_UPDATES_MGMT.SEARCH_PLACEHOLDER')}
                            searchQuery={searchQuery}
                            onSearchQueryChange={setSearchQuery}
                            actions={
                                <Button
                                    label={t('WIDGET_UPDATES_MGMT.HEADER_BTN_TXT')}
                                    size="sm"
                                    onClick={() => setShowAddPopup(true)}
                                />
                            }
                        />
                    }
                    body={
                        <BaseTable
                            headers={tableHeaders}
                            hasItems={filteredUpdates.length > 0}
                            noDataMessage={searchQuery ? t('WIDGET_UPDATES_MGMT.NO_RESULTS') : t('WIDGET_UPDATES_MGMT.LIST.404')}
                        >
                            {filteredUpdates.map(update => (
                                <BaseTableRow key={update.id}>
                                    <BaseTableCell>
                                        {update.cover_url ? (
                                            <img src={update.cover_url} alt="" className="object-cover w-16 h-10 rounded-md" />
                                        ) : (
                                            <div className="flex items-center justify-center w-16 h-10 rounded-md bg-n-slate-3 text-n-slate-9">
                                                <span className="i-lucide-image size-4" />
                                            </div>
                                        )}
                                    </BaseTableCell>

                                    <BaseTableCell>
                                        <span className="text-body-main text-n-slate-12 line-clamp-1">{update.title}</span>
                                    </BaseTableCell>

                                    <BaseTableCell>
                                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${TAG_TONE[update.tag]}`}>
                                            {t(TAG_LABEL_KEY[update.tag])}
                                        </span>
                                    </BaseTableCell>

                                    <BaseTableCell>
                                        <span className="text-body-main text-n-slate-11">
                                            {update.inbox?.name ?? t('WIDGET_UPDATES_MGMT.LIST.ALL_INBOXES')}
                                        </span>
                                    </BaseTableCell>

                                    <BaseTableCell>
                                        <div className="flex flex-col">
                                            <span className={`text-body-main ${update.published ? 'text-n-teal-11' : 'text-n-slate-11'}`}>
                                                {update.published
                                                    ? t('WIDGET_UPDATES_MGMT.LIST.STATUS_PUBLISHED')
                                                    : t('WIDGET_UPDATES_MGMT.LIST.STATUS_DRAFT')}
                                            </span>
                                            {update.published && update.published_at ? (
                                                <span className="text-xs text-n-slate-10">{formatDate(update.published_at)}</span>
                                            ) : null}
                                        </div>
                                    </BaseTableCell>

                                    <BaseTableCell align="end">
                                        <div className="flex justify-end flex-shrink-0 gap-3">
                                            <Button
                                                title={update.published ? t('WIDGET_UPDATES_MGMT.FORM.UNPUBLISH') : t('WIDGET_UPDATES_MGMT.FORM.PUBLISH')}
                                                icon={update.published ? 'i-lucide-eye-off' : 'i-lucide-upload'}
                                                slate
                                                sm
                                                isLoading={pendingIds.includes(update.id)}
                                                onClick={() => void togglePublish(update)}
                                            />
                                            <Button
                                                title={t('WIDGET_UPDATES_MGMT.FORM.EDIT')}
                                                icon={ICONS.edit}
                                                slate
                                                sm
                                                isLoading={pendingIds.includes(update.id)}
                                                onClick={() => setEditingUpdate(update)}
                                            />
                                            <Button
                                                title={t('WIDGET_UPDATES_MGMT.FORM.DELETE')}
                                                icon={ICONS.delete}
                                                slate
                                                sm
                                                className="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
                                                isLoading={pendingIds.includes(update.id)}
                                                onClick={() => setDeletingUpdate(update)}
                                            />
                                        </div>
                                    </BaseTableCell>
                                </BaseTableRow>
                            ))}
                        </BaseTable>
                    }
                >
                    {hasMore && !searchQuery ? (
                        <div className="flex justify-center py-4">
                            <Button
                                variant="faded"
                                color="slate"
                                size="sm"
                                isLoading={isLoadingMore}
                                label={t('MESSAGE_LIST.LOAD_MORE')}
                                onClick={() => void loadMore()}
                            />
                        </div>
                    ) : null}

                    <Modal show={showAddPopup} onClose={() => setShowAddPopup(false)} size={FORM_MODAL_SIZE}>
                        <AddWidgetUpdate
                            accountId={accountId}
                            onClose={() => setShowAddPopup(false)}
                            onCreated={update => setUpdates(current => [update, ...current])}
                        />
                    </Modal>

                    <Modal show={editingUpdate !== null} onClose={() => setEditingUpdate(null)} size={FORM_MODAL_SIZE}>
                        {editingUpdate ? (
                            <EditWidgetUpdate
                                accountId={accountId}
                                update={editingUpdate}
                                onClose={() => setEditingUpdate(null)}
                                onUpdated={updated =>
                                    setUpdates(current => current.map(item => (item.id === updated.id ? updated : item)))
                                }
                            />
                        ) : null}
                    </Modal>

                    <DeleteModal
                        show={deletingUpdate !== null}
                        onClose={() => setDeletingUpdate(null)}
                        onConfirm={() => void confirmDeletion()}
                        title={t('WIDGET_UPDATES_MGMT.DELETE.CONFIRM.TITLE')}
                        message={t('WIDGET_UPDATES_MGMT.DELETE.CONFIRM.MESSAGE')}
                        messageValue={` ${deletingUpdate?.title ?? ''}?`}
                        confirmText={t('WIDGET_UPDATES_MGMT.DELETE.CONFIRM.YES')}
                        rejectText={t('WIDGET_UPDATES_MGMT.DELETE.CONFIRM.NO')}
                    />
                </SettingsLayout>
            </SettingsWrapper>
        </Dashboard>
    );
}
