import { useEffect, useSyncExternalStore } from 'react';

import { deleteJson, getJson, postForm, postJson, putForm } from 'dashboard/helper/apiClient';

// Port từ store/modules/agentBots.js + api/agentBots.js.
// Danh sách bot dùng chung giữa Settings > Bots và tab "Bot Configuration" của
// inbox, nên cache ở module như useCannedResponses.

export interface AgentBot {
    id: number;
    name: string;
    description: string | null;
    thumbnail: string | null;
    outgoing_url?: string | null;
    bot_type: string;
    bot_config?: { webhook_url?: string } | null;
    account_id: number | null;
    access_token?: string;
    secret?: string;
    system_bot: boolean;
}

export interface AgentBotFormValues {
    name: string;
    description: string;
    outgoing_url: string;
    bot_type?: string;
    avatar?: File | null;
}

const EMPTY_BOTS: AgentBot[] = [];

let records: AgentBot[] = EMPTY_BOTS;
let isFetching = false;
let loadedAccountId = 0;
let pendingAccountId = 0;
const listeners = new Set<() => void>();

function notify(): void {
    listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function endpoint(accountId: number, id?: number): string {
    const base = `/api/v1/accounts/${accountId}/agent_bots`;
    return id ? `${base}/${id}` : base;
}

function upsert(bot: AgentBot): void {
    records = records.some(record => record.id === bot.id)
        ? records.map(record => (record.id === bot.id ? { ...record, ...bot } : record))
        : [...records, bot];
    notify();
}

function toFormData(values: AgentBotFormValues): FormData {
    const form = new FormData();
    form.append('name', values.name);
    form.append('description', values.description);
    form.append('bot_type', values.bot_type || 'webhook');
    form.append('outgoing_url', values.outgoing_url);
    if (values.avatar) form.append('avatar', values.avatar);
    return form;
}

export function fetchAgentBots(accountId: number, { force = false } = {}): void {
    if (!accountId) return;
    if (pendingAccountId === accountId) return;
    if (!force && loadedAccountId === accountId) return;

    pendingAccountId = accountId;
    isFetching = true;
    notify();

    getJson<AgentBot[]>(endpoint(accountId))
        .then(response => {
            records = Array.isArray(response) ? response : EMPTY_BOTS;
            loadedAccountId = accountId;
        })
        .catch(() => undefined)
        .finally(() => {
            pendingAccountId = 0;
            isFetching = false;
            notify();
        });
}

export async function createAgentBot(accountId: number, values: AgentBotFormValues): Promise<AgentBot> {
    const created = await postForm<AgentBot>(endpoint(accountId), toFormData(values));
    upsert(created);
    return created;
}

export async function updateAgentBot(
    accountId: number,
    id: number,
    values: AgentBotFormValues,
): Promise<AgentBot> {
    const updated = await putForm<AgentBot>(endpoint(accountId, id), toFormData(values));
    upsert(updated);
    return updated;
}

export async function deleteAgentBot(accountId: number, id: number): Promise<void> {
    await deleteJson(endpoint(accountId, id));
    records = records.filter(record => record.id !== id);
    notify();
}

export async function deleteAgentBotAvatar(accountId: number, id: number): Promise<void> {
    await deleteJson(`${endpoint(accountId, id)}/avatar`);
    records = records.map(record => (record.id === id ? { ...record, thumbnail: '' } : record));
    notify();
}

export async function resetAgentBotAccessToken(accountId: number, id: number): Promise<AgentBot> {
    const bot = await postJson<AgentBot>(`${endpoint(accountId, id)}/reset_access_token`, {});
    upsert(bot);
    return bot;
}

export async function resetAgentBotSecret(accountId: number, id: number): Promise<AgentBot> {
    const bot = await postJson<AgentBot>(`${endpoint(accountId, id)}/reset_secret`, {});
    upsert(bot);
    return bot;
}

export async function fetchInboxAgentBot(accountId: number, inboxId: number): Promise<AgentBot | null> {
    const response = await getJson<{ agent_bot?: Partial<AgentBot> } | null>(
        `/api/v1/accounts/${accountId}/inboxes/${inboxId}/agent_bot`,
    );
    // Inbox chưa gắn bot: cả Chatwoot lẫn Yona trả `{"agent_bot": {}}` — object rỗng
    // vẫn truthy nên phải xét theo `id`.
    const bot = response?.agent_bot;
    return bot?.id ? (bot as AgentBot) : null;
}

export async function setInboxAgentBot(
    accountId: number,
    inboxId: number,
    botId: number | null,
): Promise<void> {
    await postJson(`/api/v1/accounts/${accountId}/inboxes/${inboxId}/set_agent_bot`, {
        agent_bot: botId ?? null,
    });
}

let snapshot: { bots: AgentBot[]; isFetching: boolean } = { bots: EMPTY_BOTS, isFetching: false };

function botsSnapshot(): { bots: AgentBot[]; isFetching: boolean } {
    if (snapshot.bots !== records || snapshot.isFetching !== isFetching) {
        snapshot = { bots: records, isFetching };
    }
    return snapshot;
}

export function useAgentBots(accountId: number): { bots: AgentBot[]; isFetching: boolean } {
    useEffect(() => fetchAgentBots(accountId), [accountId]);

    return useSyncExternalStore(subscribe, botsSnapshot, botsSnapshot);
}
