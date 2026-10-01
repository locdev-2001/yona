import { useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { picoSearch } from '@ext/pico-search';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { deleteJson, getJson } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from '../../Dashboard';
import SettingsWrapper from '../SettingsWrapper';
import SettingsLayout from '../SettingsLayout';
import BaseSettingsHeader from '../BaseSettingsHeader';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon';
import ChannelName from './components/ChannelName';
import ConfirmDeleteModal from 'dashboard/components/widgets/modal/ConfirmDeleteModal';
import type { Inbox } from './types';
import type { DashboardPageProps } from '../../types';

// Port từ dashboard/routes/dashboard/settings/inbox/Index.vue @ v4.17.1.
export default function InboxesIndex() {
    const { currentAccount, currentAccountUser } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;
    const isAdmin = currentAccountUser?.role === 'administrator';

    const [inboxes, setInboxes] = useState<Inbox[]>([]);
    const [isFetching, setFetching] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingInbox, setDeletingInbox] = useState<Inbox | null>(null);

    useEffect(() => {
        let active = true;

        getJson<{ payload: Inbox[] }>(`/api/v1/accounts/${accountId}/inboxes`)
            .then(response => {
                if (active) setInboxes(response.payload);
            })
            .finally(() => {
                if (active) setFetching(false);
            });

        return () => {
            active = false;
        };
    }, [accountId]);

    const inboxesList = useMemo(
        () => inboxes.slice().sort((a, b) => a.name.localeCompare(b.name)),
        [inboxes],
    );

    const filteredInboxesList = useMemo(() => {
        const query = searchQuery.trim();
        if (!query) return inboxesList;
        return picoSearch(inboxesList, query, ['name', 'channel_type']) as Inbox[];
    }, [inboxesList, searchQuery]);

    const confirmDeletion = async () => {
        const inbox = deletingInbox;
        if (!inbox) return;

        setDeletingInbox(null);
        try {
            await deleteJson(`/api/v1/accounts/${accountId}/inboxes/${inbox.id}`);
            setInboxes(current => current.filter(item => item.id !== inbox.id));
            useAlert(t('INBOX_MGMT.DELETE.API.SUCCESS_MESSAGE'));
        } catch {
            useAlert(t('INBOX_MGMT.DELETE.API.ERROR_MESSAGE'));
        }
    };

    const inboxRow = (inbox: Inbox) => (
        <div key={inbox.id} className="flex justify-between flex-row items-start gap-4 py-4">
            <div className="flex items-center gap-4">
                {inbox.avatar_url ? (
                    <div className="bg-n-alpha-3 rounded-xl size-10 ring ring-n-solid-1 border border-n-strong shadow-sm grid place-items-center">
                        <Avatar
                            src={inbox.avatar_url}
                            name={inbox.name}
                            size={24}
                            roundedFull
                            platform={inbox.platform ?? null}
                        />
                    </div>
                ) : (
                    <div className="size-10 justify-center bg-n-alpha-3 rounded-xl ring ring-n-solid-1 border border-n-strong shadow-sm grid place-items-center">
                        <ChannelIcon className="size-6 text-n-slate-10" inbox={inbox} />
                    </div>
                )}
                <div className="flex flex-col items-start gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                        <span className="block text-heading-3 text-n-slate-12 capitalize">{inbox.name}</span>
                        {inbox.reauthorization_required ? (
                            <span className="rounded-md bg-n-ruby-3 px-1.5 py-0.5 text-label-small text-n-ruby-11">
                                {t('INBOX_MGMT.CONNECTION_CHECK.BADGE')}
                            </span>
                        ) : null}
                    </span>
                    <ChannelName
                        channelType={inbox.channel_type}
                        medium={inbox.medium}
                        className="text-body-main text-n-slate-11"
                    />
                </div>
            </div>
            <div className="flex gap-3 justify-end">
                {isAdmin ? (
                    <a href={accountScopedUrl(accountId, `settings/inboxes/${inbox.id}`)}>
                        <Button title={t('INBOX_MGMT.SETTINGS')} icon="i-woot-settings" slate sm />
                    </a>
                ) : null}
                {isAdmin ? (
                    <Button
                        title={t('INBOX_MGMT.DELETE.BUTTON_TEXT')}
                        icon="i-woot-bin"
                        slate
                        sm
                        className="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
                        onClick={() => setDeletingInbox(inbox)}
                    />
                ) : null}
            </div>
        </div>
    );

    return (
        <Dashboard>
            <SettingsWrapper>
                <SettingsLayout
                    isLoading={isFetching}
                    noRecordsFound={!inboxesList.length}
                    noRecordsMessage={t('INBOX_MGMT.LIST.404')}
                    header={
                        <BaseSettingsHeader
                            title={t('INBOX_MGMT.HEADER')}
                            description={t('INBOX_MGMT.DESCRIPTION')}
                            linkText={t('INBOX_MGMT.LEARN_MORE')}
                            featureName="inboxes"
                            searchPlaceholder={t('INBOX_MGMT.SEARCH_PLACEHOLDER')}
                            searchQuery={searchQuery}
                            onSearchQueryChange={setSearchQuery}
                            count={
                                inboxesList.length ? (
                                    <span className="text-body-main text-n-slate-11">
                                        {t('INBOX_MGMT.COUNT', { n: inboxesList.length })}
                                    </span>
                                ) : null
                            }
                            actions={
                                isAdmin ? (
                                    <a href={accountScopedUrl(accountId, 'settings/inboxes/new')}>
                                        <Button label={t('SETTINGS.INBOXES.NEW_INBOX')} size="sm" />
                                    </a>
                                ) : null
                            }
                        />
                    }
                    body={
                        !filteredInboxesList.length && searchQuery ? (
                            <span className="flex-1 flex items-center justify-center py-20 text-center text-body-main !text-base text-n-slate-11">
                                {t('INBOX_MGMT.NO_RESULTS')}
                            </span>
                        ) : (
                            <div className="divide-y divide-n-weak border-t border-n-weak">
                                {filteredInboxesList.map(inboxRow)}
                            </div>
                        )
                    }
                >
                    <ConfirmDeleteModal
                        show={deletingInbox !== null}
                        title={t('INBOX_MGMT.DELETE.CONFIRM.TITLE')}
                        message={`${t('INBOX_MGMT.DELETE.CONFIRM.MESSAGE')} ${deletingInbox?.name ?? ''}?`}
                        confirmText={`${t('INBOX_MGMT.DELETE.CONFIRM.YES')} ${deletingInbox?.name ?? ''}`}
                        rejectText={`${t('INBOX_MGMT.DELETE.CONFIRM.NO')} ${deletingInbox?.name ?? ''}`}
                        confirmValue={deletingInbox?.name ?? ''}
                        confirmPlaceHolderText={t('INBOX_MGMT.DELETE.CONFIRM.PLACE_HOLDER', {
                            inboxName: deletingInbox?.name ?? '',
                        })}
                        onClose={() => setDeletingInbox(null)}
                        onConfirm={() => void confirmDeletion()}
                    />
                </SettingsLayout>
            </SettingsWrapper>
        </Dashboard>
    );
}
