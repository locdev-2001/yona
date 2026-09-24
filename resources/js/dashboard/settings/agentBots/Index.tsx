import { useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { picoSearch } from '@ext/pico-search';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { deleteAgentBot, useAgentBots } from 'dashboard/composables/useAgentBots';
import type { AgentBot } from 'dashboard/composables/useAgentBots';
import Dashboard from '../../Dashboard';
import SettingsWrapper from '../SettingsWrapper';
import SettingsLayout from '../SettingsLayout';
import BaseSettingsHeader from '../BaseSettingsHeader';
import Button from 'dashboard/components-next/button/Button';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import BaseTable from 'dashboard/components-next/table/BaseTable';
import BaseTableRow from 'dashboard/components-next/table/BaseTableRow';
import BaseTableCell from 'dashboard/components-next/table/BaseTableCell';
import AgentBotModal from './components/AgentBotModal';
import type { AgentBotModalType } from './components/AgentBotModal';
import type { DashboardPageProps } from '../../types';

// Port từ dashboard/routes/dashboard/settings/agentBots/Index.vue.
export default function AgentBotsIndex() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;

    const { bots, isFetching } = useAgentBots(accountId);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBot, setSelectedBot] = useState<AgentBot | null>(null);
    const [modalType, setModalType] = useState<AgentBotModalType>('create');
    const [deletingIds, setDeletingIds] = useState<number[]>([]);
    const [isDeleting, setDeleting] = useState(false);

    const botModalRef = useRef<DialogHandle>(null);
    const deleteDialogRef = useRef<DialogHandle>(null);

    const filteredBots = useMemo(() => {
        const query = searchQuery.trim();
        if (!query) return bots;
        return picoSearch(bots, query, ['name', 'description']);
    }, [bots, searchQuery]);

    const openAddModal = () => {
        setModalType('create');
        setSelectedBot(null);
        botModalRef.current?.open();
    };

    const openEditModal = (bot: AgentBot) => {
        setModalType('edit');
        setSelectedBot(bot);
        botModalRef.current?.open();
    };

    const confirmDeletion = async () => {
        const bot = selectedBot;
        deleteDialogRef.current?.close();
        if (!bot) return;

        setDeleting(true);
        setDeletingIds(current => [...current, bot.id]);
        try {
            await deleteAgentBot(accountId, bot.id);
            useAlert(t('AGENT_BOTS.DELETE.API.SUCCESS_MESSAGE'));
        } catch {
            useAlert(t('AGENT_BOTS.DELETE.API.ERROR_MESSAGE'));
        } finally {
            setDeleting(false);
            setDeletingIds(current => current.filter(id => id !== bot.id));
            setSelectedBot(null);
        }
    };

    const tableHeaders = [
        t('AGENT_BOTS.LIST.TABLE_HEADER.DETAILS'),
        t('AGENT_BOTS.LIST.TABLE_HEADER.URL'),
        t('AGENT_BOTS.LIST.TABLE_HEADER.ACTIONS'),
    ];

    return (
        <Dashboard>
            <SettingsWrapper>
                <SettingsLayout
                    isLoading={isFetching}
                    loadingMessage={t('AGENT_BOTS.LIST.LOADING')}
                    noRecordsFound={!bots.length}
                    noRecordsMessage={t('AGENT_BOTS.LIST.404')}
                    header={
                        <BaseSettingsHeader
                            title={t('AGENT_BOTS.HEADER')}
                            description={t('AGENT_BOTS.DESCRIPTION')}
                            linkText={t('AGENT_BOTS.LEARN_MORE')}
                            searchPlaceholder={t('AGENT_BOTS.SEARCH_PLACEHOLDER')}
                            searchQuery={searchQuery}
                            onSearchQueryChange={setSearchQuery}
                            featureName="agent_bots"
                            count={
                                bots.length ? (
                                    <span className="text-body-main text-n-slate-11">
                                        {t('AGENT_BOTS.COUNT', { n: bots.length })}
                                    </span>
                                ) : null
                            }
                            actions={<Button label={t('AGENT_BOTS.ADD.TITLE')} size="sm" onClick={openAddModal} />}
                        />
                    }
                    body={
                        <BaseTable
                            headers={tableHeaders}
                            hasItems={filteredBots.length > 0}
                            noDataMessage={searchQuery ? t('AGENT_BOTS.NO_RESULTS') : t('AGENT_BOTS.LIST.404')}
                        >
                            {filteredBots.map(bot => (
                                <BaseTableRow key={bot.id}>
                                    <BaseTableCell className="max-w-0">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <Avatar
                                                name={bot.name || ''}
                                                src={bot.thumbnail ?? ''}
                                                size={40}
                                                className="flex-shrink-0"
                                            />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-body-main text-n-slate-12 truncate">
                                                        {bot.name}
                                                    </span>
                                                    {bot.system_bot ? (
                                                        <span className="text-xs text-n-slate-12 bg-n-blue-5 rounded-md py-0.5 px-1 flex-shrink-0">
                                                            {t('AGENT_BOTS.GLOBAL_BOT_BADGE')}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <span className="text-body-main text-n-slate-11 block truncate">
                                                    {bot.description}
                                                </span>
                                            </div>
                                        </div>
                                    </BaseTableCell>

                                    <BaseTableCell className="max-w-0">
                                        <span className="text-body-main text-n-slate-11 truncate block">
                                            {bot.outgoing_url || bot.bot_config?.webhook_url}
                                        </span>
                                    </BaseTableCell>

                                    <BaseTableCell align="end" className="w-24">
                                        <div className="flex gap-3 justify-end flex-shrink-0">
                                            {!bot.system_bot ? (
                                                <>
                                                    <Button
                                                        title={t('AGENT_BOTS.EDIT.BUTTON_TEXT')}
                                                        icon="i-woot-edit-pen"
                                                        slate
                                                        sm
                                                        isLoading={deletingIds.includes(bot.id)}
                                                        onClick={() => openEditModal(bot)}
                                                    />
                                                    <Button
                                                        title={t('AGENT_BOTS.DELETE.BUTTON_TEXT')}
                                                        icon="i-woot-bin"
                                                        slate
                                                        sm
                                                        className="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
                                                        isLoading={deletingIds.includes(bot.id)}
                                                        onClick={() => {
                                                            setSelectedBot(bot);
                                                            deleteDialogRef.current?.open();
                                                        }}
                                                    />
                                                </>
                                            ) : null}
                                        </div>
                                    </BaseTableCell>
                                </BaseTableRow>
                            ))}
                        </BaseTable>
                    }
                >
                    <AgentBotModal ref={botModalRef} accountId={accountId} type={modalType} selectedBot={selectedBot} />

                    <Dialog
                        ref={deleteDialogRef}
                        type="alert"
                        title={t('AGENT_BOTS.DELETE.CONFIRM.TITLE')}
                        description={t('AGENT_BOTS.DELETE.CONFIRM.MESSAGE', { name: selectedBot?.name ?? '' })}
                        isLoading={isDeleting}
                        confirmButtonLabel={t('AGENT_BOTS.DELETE.CONFIRM.YES')}
                        cancelButtonLabel={t('AGENT_BOTS.DELETE.CONFIRM.NO')}
                        onConfirm={() => void confirmDeletion()}
                    />
                </SettingsLayout>
            </SettingsWrapper>
        </Dashboard>
    );
}
