import { useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { picoSearch } from '@chatwoot/pico-search';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { deleteJson, getJson } from 'dashboard/helper/apiClient';
import Dashboard from '../../Dashboard';
import SettingsWrapper from '../SettingsWrapper';
import SettingsLayout from '../SettingsLayout';
import BaseSettingsHeader from '../BaseSettingsHeader';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import Modal from 'dashboard/components/Modal';
import DeleteModal from 'dashboard/components/widgets/modal/DeleteModal';
import AddAgent from './AddAgent';
import EditAgent from './EditAgent';
import type { Agent } from './types';
import type { DashboardPageProps } from '../../types';

// Port từ dashboard/routes/dashboard/settings/agents/Index.vue.
// Custom role (tooltip quyền) = EE nên bỏ; danh sách agent lấy qua fetch
// thay cho vuex store agents.
export default function AgentsIndex() {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount!.id;
    const currentUserId = auth.user!.id;

    const [agents, setAgents] = useState<Agent[]>([]);
    const [isFetching, setFetching] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddPopup, setShowAddPopup] = useState(false);
    const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
    const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);
    const [deletingIds, setDeletingIds] = useState<number[]>([]);

    useEffect(() => {
        let active = true;

        getJson<Agent[]>(`/api/v1/accounts/${accountId}/agents`)
            .then(list => {
                if (active) setAgents(list);
            })
            .finally(() => {
                if (active) setFetching(false);
            });

        return () => {
            active = false;
        };
    }, [accountId]);

    const filteredAgents = useMemo(() => {
        const query = searchQuery.trim();
        if (!query) return agents;

        return picoSearch(agents, query, ['name', 'email']);
    }, [agents, searchQuery]);

    const verifiedAdministratorCount = agents.filter(
        agent => agent.role === 'administrator' && agent.confirmed,
    ).length;

    const showEditAction = (agent: Agent) => currentUserId !== agent.id;

    const showDeleteAction = (agent: Agent) => {
        if (currentUserId === agent.id) return false;
        if (!agent.confirmed) return true;
        if (agent.role === 'administrator') return verifiedAdministratorCount !== 1;

        return true;
    };

    const confirmDeletion = async () => {
        const agent = deletingAgent;
        if (!agent) return;

        setDeletingIds(current => [...current, agent.id]);
        setDeletingAgent(null);
        try {
            await deleteJson(`/api/v1/accounts/${accountId}/agents/${agent.id}`);
            setAgents(current => current.filter(item => item.id !== agent.id));
            useAlert(t('AGENT_MGMT.DELETE.API.SUCCESS_MESSAGE'));
        } catch {
            useAlert(t('AGENT_MGMT.DELETE.API.ERROR_MESSAGE'));
        } finally {
            setDeletingIds(current => current.filter(id => id !== agent.id));
        }
    };

    return (
        <Dashboard>
            <SettingsWrapper>
                <SettingsLayout
                    isLoading={isFetching}
                    loadingMessage={t('AGENT_MGMT.LOADING')}
                    noRecordsFound={agents.length === 0}
                    noRecordsMessage={t('AGENT_MGMT.LIST.404')}
                    header={
                        <BaseSettingsHeader
                            title={t('AGENT_MGMT.HEADER')}
                            description={t('AGENT_MGMT.DESCRIPTION')}
                            linkText={t('AGENT_MGMT.LEARN_MORE')}
                            featureName="agents"
                            searchPlaceholder={t('AGENT_MGMT.SEARCH_PLACEHOLDER')}
                            searchQuery={searchQuery}
                            onSearchQueryChange={setSearchQuery}
                            count={
                                agents.length ? (
                                    <span className="text-body-main text-n-slate-11">
                                        {t('AGENT_MGMT.COUNT', { n: agents.length })}
                                    </span>
                                ) : null
                            }
                            actions={
                                <Button
                                    label={t('AGENT_MGMT.HEADER_BTN_TXT')}
                                    size="sm"
                                    onClick={() => setShowAddPopup(true)}
                                />
                            }
                        />
                    }
                    body={
                        !filteredAgents.length && searchQuery ? (
                            <span className="flex-1 flex items-center justify-center py-20 text-center text-body-main !text-base text-n-slate-11">
                                {t('AGENT_MGMT.NO_RESULTS')}
                            </span>
                        ) : (
                            <div className="divide-y divide-n-weak border-t border-n-weak">
                                {filteredAgents.map(agent => (
                                    <div
                                        key={agent.email}
                                        className="flex justify-between flex-row items-start gap-4 py-4"
                                    >
                                        <div className="flex items-center gap-4">
                                            <Avatar
                                                src={agent.thumbnail}
                                                name={agent.name}
                                                status={agent.availability_status}
                                                size={40}
                                                hideOfflineStatus
                                            />
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <span className="block text-heading-3 text-n-slate-12 capitalize">
                                                    {agent.name}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-body-main text-n-slate-11">
                                                        {agent.email}
                                                    </span>
                                                    <div className="w-px h-3 bg-n-strong rounded-lg" />
                                                    <span className="block w-fit text-body-main text-n-slate-11 relative">
                                                        {t(
                                                            `AGENT_MGMT.AGENT_TYPES.${agent.role.toUpperCase()}`,
                                                        )}
                                                    </span>
                                                    <div className="w-px h-3 bg-n-strong rounded-lg" />
                                                    <span className="text-body-main text-n-slate-11">
                                                        {agent.confirmed
                                                            ? t('AGENT_MGMT.LIST.VERIFIED')
                                                            : t('AGENT_MGMT.LIST.VERIFICATION_PENDING')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-3">
                                            {showEditAction(agent) ? (
                                                <Button
                                                    title={t('AGENT_MGMT.EDIT.BUTTON_TEXT')}
                                                    icon="i-woot-edit-pen"
                                                    slate
                                                    sm
                                                    onClick={() => setEditingAgent(agent)}
                                                />
                                            ) : null}
                                            {showDeleteAction(agent) ? (
                                                <Button
                                                    title={t('AGENT_MGMT.DELETE.BUTTON_TEXT')}
                                                    icon="i-woot-bin"
                                                    slate
                                                    sm
                                                    className="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
                                                    isLoading={deletingIds.includes(agent.id)}
                                                    onClick={() => setDeletingAgent(agent)}
                                                />
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    }
                >
                    <Modal show={showAddPopup} onClose={() => setShowAddPopup(false)}>
                        <AddAgent
                            accountId={accountId}
                            onClose={() => setShowAddPopup(false)}
                            onCreated={agent => setAgents(current => [...current, agent])}
                        />
                    </Modal>

                    <Modal show={editingAgent !== null} onClose={() => setEditingAgent(null)}>
                        {editingAgent ? (
                            <EditAgent
                                accountId={accountId}
                                agent={editingAgent}
                                onClose={() => setEditingAgent(null)}
                                onUpdated={updated =>
                                    setAgents(current =>
                                        current.map(item => (item.id === updated.id ? updated : item)),
                                    )
                                }
                            />
                        ) : null}
                    </Modal>

                    <DeleteModal
                        show={deletingAgent !== null}
                        onClose={() => setDeletingAgent(null)}
                        onConfirm={() => void confirmDeletion()}
                        title={t('AGENT_MGMT.DELETE.CONFIRM.TITLE')}
                        message={t('AGENT_MGMT.DELETE.CONFIRM.MESSAGE')}
                        messageValue={` ${deletingAgent?.name ?? ''}?`}
                        confirmText={`${t('AGENT_MGMT.DELETE.CONFIRM.YES')} ${deletingAgent?.name ?? ''}`}
                        rejectText={`${t('AGENT_MGMT.DELETE.CONFIRM.NO')} ${deletingAgent?.name ?? ''}`}
                    />
                </SettingsLayout>
            </SettingsWrapper>
        </Dashboard>
    );
}
