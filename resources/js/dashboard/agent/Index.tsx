import { useCallback, useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../i18n';
import Dashboard from '../Dashboard';
import SettingsWrapper from '../settings/SettingsWrapper';
import BaseSettingsHeader from '../settings/BaseSettingsHeader';
import Button from 'dashboard/components-next/button/Button';
import LoadingState from 'dashboard/components/widgets/LoadingState';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import AiAgentCard from './AiAgentCard';
import AiAgentDrawer from './AiAgentDrawer';
import ChannelAssignmentTable from './ChannelAssignmentTable';
import ConfirmDialog from './ConfirmDialog';
import { applyInboxAssignment, applySavedAiAgent, assignmentConfirmation } from './channelAssignment';
import type { AssignmentConfirmation } from './channelAssignment';
import {
    assignInboxAiAgent,
    createAiAgent,
    deleteAiAgent,
    fetchAiAgents,
    setAiAgentEnabled,
    updateAiAgent,
    uploadAiAgentAvatar,
} from './aiAgentsApi';
import type { AiAgent, AiAgentFormValues, AiAgentInbox } from './types';
import type { DashboardPageProps } from '../types';

type DrawerState = { open: false } | { open: true; aiAgent: AiAgent | null };

type PendingAssignment = { confirmation: Exclude<AssignmentConfirmation, { kind: 'none' }>; nextAiAgentId: number | null };

// Số hội thoại đang tự động của một AI = tổng của các kênh nó đang giữ.
const autoReplyCount = (aiAgent: AiAgent, inboxes: AiAgentInbox[]) =>
    inboxes.filter(inbox => aiAgent.inbox_ids.includes(inbox.id)).reduce((total, inbox) => total + inbox.auto_reply_conversations_count, 0);

// Cài đặt › Nhân viên AI: thẻ từng AI, bảng AI của từng kênh, ngăn tạo/sửa.
export default function AiAgentsIndex() {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;

    const [aiAgents, setAiAgents] = useState<AiAgent[]>([]);
    const [inboxes, setInboxes] = useState<AiAgentInbox[]>([]);
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [drawer, setDrawer] = useState<DrawerState>({ open: false });
    const [isSaving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<AiAgent | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [pendingAssignment, setPendingAssignment] = useState<PendingAssignment | null>(null);
    const [savingInboxId, setSavingInboxId] = useState<number | null>(null);

    const load = useCallback(() => {
        setLoadState('loading');
        fetchAiAgents(accountId)
            .then(response => {
                setAiAgents(response.payload);
                setInboxes(response.inboxes);
                setLoadState('ready');
            })
            .catch(() => setLoadState('error'));
    }, [accountId]);

    useEffect(load, [load]);

    const openCreate = () => setDrawer({ open: true, aiAgent: null });
    const closeDrawer = useCallback(() => setDrawer({ open: false }), []);

    const applySaved = (saved: AiAgent) => {
        const next = applySavedAiAgent(aiAgents, inboxes, saved);
        setAiAgents(next.aiAgents);
        setInboxes(next.inboxes);
    };

    const submit = async (values: AiAgentFormValues, avatarFile: File | null) => {
        if (!drawer.open) return;
        const editing = drawer.aiAgent;
        setSaving(true);
        try {
            let saved = editing ? await updateAiAgent(accountId, editing.id, values) : await createAiAgent(accountId, values);
            if (avatarFile) {
                try {
                    saved = await uploadAiAgentAvatar(accountId, saved.id, avatarFile);
                } catch (error) {
                    useAlert(parseApiErrorMessage(error) || t('AI_AGENTS.FORM.AVATAR_ERROR'));
                }
            }
            applySaved(saved);
            setDrawer({ open: false });
            useAlert(t(editing ? 'AI_AGENTS.FORM.SAVED' : 'AI_AGENTS.FORM.CREATED', { name: saved.name }));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('AI_AGENTS.FORM.ERROR'));
        } finally {
            setSaving(false);
        }
    };

    const toggleEnabled = async (aiAgent: AiAgent, enabled: boolean) => {
        setAiAgents(current => current.map(item => (item.id === aiAgent.id ? { ...item, enabled } : item)));
        try {
            const saved = await setAiAgentEnabled(accountId, aiAgent.id, enabled);
            setAiAgents(current => current.map(item => (item.id === saved.id ? saved : item)));
            useAlert(t(enabled ? 'AI_AGENTS.CARD.TURNED_ON' : 'AI_AGENTS.CARD.TURNED_OFF', { name: saved.name }));
        } catch (error) {
            setAiAgents(current => current.map(item => (item.id === aiAgent.id ? { ...item, enabled: aiAgent.enabled } : item)));
            useAlert(parseApiErrorMessage(error) || t('AI_AGENTS.FORM.ERROR'));
        }
    };

    const saveAssignment = async (inbox: AiAgentInbox, nextAiAgentId: number | null) => {
        setSavingInboxId(inbox.id);
        try {
            await assignInboxAiAgent(accountId, inbox.id, nextAiAgentId);
            const next = applyInboxAssignment(aiAgents, inboxes, inbox.id, nextAiAgentId);
            setAiAgents(next.aiAgents);
            setInboxes(next.inboxes);
            useAlert(t('AI_AGENTS.CHANNELS.SAVED', { name: inbox.name }));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('AI_AGENTS.FORM.ERROR'));
        } finally {
            setSavingInboxId(null);
        }
    };

    const changeAssignment = (inbox: AiAgentInbox, nextAiAgentId: number | null) => {
        if (inbox.ai_agent_id === nextAiAgentId) return;
        const confirmation = assignmentConfirmation(inbox, nextAiAgentId, aiAgents);
        if (confirmation.kind === 'none') {
            void saveAssignment(inbox, nextAiAgentId);
            return;
        }
        setPendingAssignment({ confirmation, nextAiAgentId });
    };

    const confirmAssignment = () => {
        if (!pendingAssignment) return;
        const { confirmation, nextAiAgentId } = pendingAssignment;
        setPendingAssignment(null);
        void saveAssignment(confirmation.inbox, nextAiAgentId);
    };

    const confirmDelete = async () => {
        if (!deleting) return;
        setIsDeleting(true);
        try {
            await deleteAiAgent(accountId, deleting.id);
            setAiAgents(current => current.filter(item => item.id !== deleting.id));
            setInboxes(current => current.map(inbox => (inbox.ai_agent_id === deleting.id ? { ...inbox, ai_agent_id: null } : inbox)));
            useAlert(t('AI_AGENTS.DELETE.DONE', { name: deleting.name }));
            setDeleting(null);
            setDrawer({ open: false });
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('AI_AGENTS.DELETE.ERROR'));
        } finally {
            setIsDeleting(false);
        }
    };

    const pendingNewName =
        pendingAssignment?.nextAiAgentId != null
            ? aiAgents.find(item => item.id === pendingAssignment.nextAiAgentId)?.name ?? ''
            : '';
    const pendingConfirmation = pendingAssignment?.confirmation ?? null;

    return (
        <Dashboard>
            <SettingsWrapper>
                <div className="flex w-full flex-col gap-6">
                    <BaseSettingsHeader
                        title={t('AI_AGENTS.HEADER')}
                        description={t('AI_AGENTS.DESCRIPTION')}
                        actions={
                            loadState === 'ready' && aiAgents.length > 0 ? (
                                <Button icon="i-lucide-plus" label={t('AI_AGENTS.ADD')} onClick={openCreate} />
                            ) : null
                        }
                    />

                    {loadState === 'loading' ? <LoadingState message={t('AI_AGENTS.LOADING')} /> : null}

                    {loadState === 'error' ? (
                        <div className="panel-surface flex flex-col items-center gap-3 rounded-xl px-6 py-10 text-center">
                            <p className="m-0 text-sm text-n-slate-11">{t('AI_AGENTS.LOAD_ERROR')}</p>
                            <Button faded slate label={t('AI_AGENTS.RETRY')} onClick={load} />
                        </div>
                    ) : null}

                    {loadState === 'ready' && aiAgents.length === 0 ? (
                        <section
                            aria-label={t('AI_AGENTS.EMPTY.TITLE')}
                            className="panel-surface flex flex-col items-center gap-3 rounded-xl px-6 py-12 text-center"
                        >
                            <span className="flex size-12 items-center justify-center rounded-full bg-n-violet-3">
                                <span className="i-lucide-bot size-6 text-n-violet-11" aria-hidden />
                            </span>
                            <h2 className="m-0 text-base font-medium text-n-slate-12">{t('AI_AGENTS.EMPTY.TITLE')}</h2>
                            <p className="m-0 max-w-lg text-sm text-n-slate-11">{t('AI_AGENTS.EMPTY.DESCRIPTION')}</p>
                            <Button label={t('AI_AGENTS.EMPTY.ACTION')} onClick={openCreate} />
                        </section>
                    ) : null}

                    {loadState === 'ready' && aiAgents.length > 0 ? (
                        <>
                            <section
                                aria-label={t('AI_AGENTS.HEADER')}
                                className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))]"
                            >
                                {aiAgents.map(aiAgent => (
                                    <AiAgentCard
                                        key={aiAgent.id}
                                        aiAgent={aiAgent}
                                        inboxes={inboxes}
                                        onToggle={enabled => void toggleEnabled(aiAgent, enabled)}
                                        onEdit={() => setDrawer({ open: true, aiAgent })}
                                    />
                                ))}
                                <button
                                    type="button"
                                    className="flex min-h-36 items-center justify-center gap-2 rounded-xl border border-dashed border-n-weak text-sm font-medium text-n-blue-11 hover:bg-n-surface-hover active:scale-[0.97]"
                                    onClick={openCreate}
                                >
                                    <span className="i-lucide-plus size-4" aria-hidden />
                                    {t('AI_AGENTS.ADD')}
                                </button>
                            </section>

                            <ChannelAssignmentTable
                                inboxes={inboxes}
                                aiAgents={aiAgents}
                                savingInboxId={savingInboxId}
                                onChange={changeAssignment}
                            />
                        </>
                    ) : null}
                </div>

                <AiAgentDrawer
                    open={drawer.open}
                    aiAgent={drawer.open ? drawer.aiAgent : null}
                    aiAgents={aiAgents}
                    inboxes={inboxes}
                    isSaving={isSaving}
                    onClose={closeDrawer}
                    onSubmit={(values, avatarFile) => void submit(values, avatarFile)}
                    onDelete={setDeleting}
                />

                <ConfirmDialog
                    open={pendingConfirmation !== null}
                    title={
                        pendingConfirmation?.kind === 'replace'
                            ? t('AI_AGENTS.REPLACE.TITLE', {
                                  old: pendingConfirmation.current.name,
                                  new: pendingNewName,
                                  channel: pendingConfirmation.inbox.name,
                              })
                            : pendingConfirmation
                              ? t('AI_AGENTS.REMOVE.TITLE', { old: pendingConfirmation.current.name, channel: pendingConfirmation.inbox.name })
                              : ''
                    }
                    description={
                        pendingConfirmation?.kind === 'replace'
                            ? t('AI_AGENTS.REPLACE.DESCRIPTION', { old: pendingConfirmation.current.name, new: pendingNewName })
                            : pendingConfirmation
                              ? t('AI_AGENTS.REMOVE.DESCRIPTION', { count: pendingConfirmation.inbox.auto_reply_conversations_count })
                              : ''
                    }
                    cancelLabel={pendingConfirmation ? t('AI_AGENTS.REPLACE.KEEP', { old: pendingConfirmation.current.name }) : ''}
                    confirmLabel={
                        pendingConfirmation?.kind === 'replace'
                            ? t('AI_AGENTS.REPLACE.CONFIRM', { new: pendingNewName })
                            : t('AI_AGENTS.REMOVE.CONFIRM')
                    }
                    danger={pendingConfirmation?.kind === 'remove'}
                    onConfirm={confirmAssignment}
                    onCancel={() => setPendingAssignment(null)}
                />

                <ConfirmDialog
                    open={deleting !== null}
                    danger
                    isLoading={isDeleting}
                    title={deleting ? t('AI_AGENTS.DELETE.TITLE', { name: deleting.name }) : ''}
                    description={
                        deleting
                            ? t('AI_AGENTS.DELETE.DESCRIPTION', {
                                  name: deleting.name,
                                  channels: deleting.inbox_ids.length,
                                  conversations: autoReplyCount(deleting, inboxes),
                              })
                            : ''
                    }
                    cancelLabel={t('AI_AGENTS.DELETE.CANCEL')}
                    confirmLabel={deleting ? t('AI_AGENTS.DELETE.CONFIRM', { name: deleting.name }) : ''}
                    onConfirm={() => void confirmDelete()}
                    onCancel={() => setDeleting(null)}
                />
            </SettingsWrapper>
        </Dashboard>
    );
}
