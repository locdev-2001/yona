import * as api from '../api/widget';
import { setAuthToken } from '../api/client';
import { AGENT_TYPING_TIMEOUT, MESSAGE_TYPE, WIDGET_BUS_EVENTS } from '../helpers/constants';
import { emitter } from 'shared/helpers/emitter';
import { IFrameHelper } from '../helpers/iframe';
import {
    createTemporaryMessage,
    findUndeliveredMessage,
    getNonDeletedMessages,
    getUnreadMessageCount,
} from '../helpers/messageHelpers';
import type {
    AppConfig,
    AvailableAgent,
    ChannelConfig,
    ConversationAttributes,
    WidgetContact,
    WidgetGlobalConfig,
    WidgetMessage,
} from '../types';

// Thay toàn bộ store Vuex của widget (conversation, message, agent, appConfig,
// contacts, conversationAttributes, conversationLabels, events) bằng MỘT external
// store module-level cho useSyncExternalStore — cùng lối đã dùng ở dashboard/realtime/store.ts.

export interface BannerState {
    message: string;
    type: 'success' | 'error';
}

export interface WidgetState {
    channelConfig: ChannelConfig | null;
    globalConfig: WidgetGlobalConfig;
    contact: WidgetContact | null;
    appConfig: AppConfig;
    conversations: Record<string, WidgetMessage>;
    meta: { userLastSeenAt?: number };
    uiFlags: {
        allMessagesLoaded: boolean;
        isFetchingList: boolean;
        isAgentTyping: boolean;
        isCreating: boolean;
    };
    lastMessageId: number | string | null;
    pendingCustomAttributes: Record<string, unknown>;
    pendingLabels: string[];
    agents: AvailableAgent[];
    conversationAttributes: ConversationAttributes;
    banner: BannerState | null;
}

const DEFAULT_APP_CONFIG: AppConfig = {
    hideMessageBubble: false,
    isWidgetOpen: false,
    position: 'right',
    referrerHost: '',
    showPopoutButton: false,
    showUnreadMessagesDialog: true,
    widgetColor: '',
    widgetStyle: 'standard',
    darkMode: 'light',
    welcomeTitle: '',
    welcomeDescription: '',
    availableMessage: '',
    unavailableMessage: '',
    enableFileUpload: undefined,
    enableEmojiPicker: true,
    enableEndConversation: true,
};

let state: WidgetState = {
    channelConfig: null,
    globalConfig: {},
    contact: null,
    appConfig: DEFAULT_APP_CONFIG,
    conversations: {},
    meta: {},
    uiFlags: { allMessagesLoaded: false, isFetchingList: false, isAgentTyping: false, isCreating: false },
    lastMessageId: null,
    pendingCustomAttributes: {},
    pendingLabels: [],
    agents: [],
    conversationAttributes: { id: '', status: '' },
    banner: null,
};

type Listener = () => void;
const listeners = new Set<Listener>();

function setState(patch: Partial<WidgetState>): void {
    state = { ...state, ...patch };
    listeners.forEach(listener => listener());
}

let bannerTimer: ReturnType<typeof setTimeout> | null = null;
let agentTypingTimer: ReturnType<typeof setTimeout> | null = null;

const hasConversation = () => Boolean(state.conversationAttributes.id);

const hasPendingMetadata = () =>
    Object.keys(state.pendingCustomAttributes).length > 0 || state.pendingLabels.length > 0;

const pendingMetadata = () =>
    hasPendingMetadata()
        ? { customAttributes: state.pendingCustomAttributes, labels: state.pendingLabels }
        : {};

// conversation/mutations.js#pushMessageToConversation
function pushMessageToConversation(message: WidgetMessage): void {
    const conversations = { ...state.conversations };
    const isMessageIncoming = message.message_type === MESSAGE_TYPE.INCOMING;
    const isTemporaryMessage = message.status === 'in_progress';

    if (!isMessageIncoming || isTemporaryMessage) {
        conversations[message.id] = message;
        setState({ conversations });
        return;
    }

    const [messageInConversation] = findUndeliveredMessage(conversations, message);
    if (messageInConversation) {
        delete conversations[messageInConversation.id];
    }
    conversations[message.id] = message;
    setState({ conversations });
}

export const widgetStore = {
    getState: (): WidgetState => state,

    subscribe(listener: Listener): () => void {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },

    setChannelConfig(channelConfig: ChannelConfig, globalConfig: WidgetGlobalConfig, contact: WidgetContact): void {
        setState({
            channelConfig,
            globalConfig,
            contact,
            appConfig: { ...state.appConfig, widgetColor: channelConfig.widgetColor },
        });
    },

    // appConfig/setAppConfig — cấu hình SDK gửi qua `config-set`.
    setAppConfig(config: Partial<AppConfig>): void {
        setState({
            appConfig: {
                ...state.appConfig,
                ...config,
                hideMessageBubble: Boolean(config.hideMessageBubble),
                position: config.position || 'right',
                showPopoutButton: Boolean(config.showPopoutButton),
                showUnreadMessagesDialog: Boolean(config.showUnreadMessagesDialog),
                widgetStyle: config.widgetStyle || 'rounded',
                darkMode: config.darkMode || 'light',
            },
        });
    },

    patchAppConfig(patch: Partial<AppConfig>): void {
        setState({ appConfig: { ...state.appConfig, ...patch } });
    },

    setWidgetColor(widgetColor: string): void {
        setState({ appConfig: { ...state.appConfig, widgetColor } });
    },

    showBanner(banner: BannerState): void {
        if (bannerTimer) clearTimeout(bannerTimer);
        setState({ banner });
        bannerTimer = setTimeout(() => setState({ banner: null }), 3000);
    },

    // ── conversation ───────────────────────────────────────────────────────────
    async fetchOldConversations({ before }: { before?: number | string } = {}): Promise<void> {
        try {
            setState({ uiFlags: { ...state.uiFlags, isFetchingList: true } });
            const { payload, meta } = await api.fetchMessages({ before });
            const messages = getNonDeletedMessages({ messages: payload ?? [] });
            const conversations = { ...state.conversations };
            messages.forEach(message => {
                conversations[message.id] = message;
            });
            setState({
                conversations,
                meta: { userLastSeenAt: meta?.contact_last_seen_at },
                uiFlags: {
                    ...state.uiFlags,
                    isFetchingList: false,
                    allMessagesLoaded: messages.length === 0 ? true : state.uiFlags.allMessagesLoaded,
                },
            });
        } catch {
            setState({ uiFlags: { ...state.uiFlags, isFetchingList: false } });
        }
    },

    // conversation/actions.js#syncLatestMessages — bù tin tạo lúc mất socket.
    async syncLatestMessages(): Promise<void> {
        try {
            const { payload, meta } = await api.fetchMessages({ after: state.lastMessageId ?? undefined });
            const messages = getNonDeletedMessages({ messages: payload ?? [] });
            const missing = messages.filter(message => state.conversations[message.id] === undefined);
            if (!missing.length) return;

            const conversations = { ...state.conversations };
            missing.forEach(message => {
                conversations[message.id] = message;
            });
            const sorted = Object.fromEntries(
                Object.entries(conversations).sort((a, b) => a[1].created_at - b[1].created_at),
            );
            setState({ conversations: sorted, meta: { userLastSeenAt: meta?.contact_last_seen_at } });
        } catch {
            // Bỏ qua như bản gốc.
        }
    },

    setLastMessageId(): void {
        const messages = Object.values(state.conversations);
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage) return;
        setState({ lastMessageId: lastMessage.id });
    },

    async sendMessage({ content, replyTo }: { content: string; replyTo?: number | string | null }): Promise<void> {
        await widgetStore.sendMessageWithData(createTemporaryMessage({ content, replyTo }));
    },

    async sendMessageWithData(message: WidgetMessage): Promise<void> {
        const metadata = pendingMetadata();
        pushMessageToConversation(message);
        try {
            const data = await api.sendMessage(message.content ?? '', message.replyTo ?? null, metadata);
            if (hasPendingMetadata()) widgetStore.clearPendingConversationMetadata();
            pushMessageToConversation({ ...data, status: 'sent' });
        } catch {
            pushMessageToConversation({ ...message, status: 'failed' });
        }
    },

    async sendAttachment({
        attachment,
        replyTo = null,
    }: {
        attachment: { file: File | string; thumbUrl: string; fileType: string };
        replyTo?: number | string | null;
    }): Promise<void> {
        const temporaryMessage = createTemporaryMessage({
            attachments: [
                {
                    thumb_url: attachment.thumbUrl,
                    data_url: attachment.thumbUrl,
                    file_type: attachment.fileType,
                    status: 'in_progress',
                },
            ],
            replyTo,
        });
        const metadata = pendingMetadata();
        pushMessageToConversation(temporaryMessage);
        try {
            const data = await api.sendAttachment({ file: attachment.file, replyTo }, metadata);
            if (hasPendingMetadata()) widgetStore.clearPendingConversationMetadata();
            const conversations = { ...state.conversations };
            delete conversations[temporaryMessage.id];
            setState({ conversations });
            pushMessageToConversation({ ...data, status: 'sent' });
        } catch {
            pushMessageToConversation({ ...temporaryMessage, status: 'failed' });
        }
    },

    addOrUpdateMessage(message: WidgetMessage): void {
        if (message.content_attributes?.deleted) {
            const conversations = { ...state.conversations };
            delete conversations[message.id];
            setState({ conversations });
            return;
        }
        pushMessageToConversation(message);
    },

    updateMessageContentAttributes(id: number | string, contentAttributes: Record<string, unknown>): void {
        const message = state.conversations[id];
        if (!message) return;
        setState({
            conversations: {
                ...state.conversations,
                [id]: {
                    ...message,
                    content_attributes: { ...(message.content_attributes || {}), ...contentAttributes },
                },
            },
        });
    },

    clearConversations(): void {
        setState({ conversations: {}, pendingCustomAttributes: {}, pendingLabels: [] });
    },

    toggleAgentTyping(status: 'on' | 'off'): void {
        if (agentTypingTimer) {
            clearTimeout(agentTypingTimer);
            agentTypingTimer = null;
        }
        setState({ uiFlags: { ...state.uiFlags, isAgentTyping: status === 'on' } });
        if (status === 'on') {
            agentTypingTimer = setTimeout(() => widgetStore.toggleAgentTyping('off'), AGENT_TYPING_TIMEOUT);
        }
    },

    async toggleUserTyping(typingStatus: 'on' | 'off'): Promise<void> {
        try {
            await api.toggleTyping(typingStatus);
        } catch {
            // Bỏ qua như bản gốc.
        }
    },

    async setUserLastSeen(): Promise<void> {
        if (!Object.keys(state.conversations).length) return;
        const lastSeen = Date.now() / 1000;
        try {
            setState({ meta: { userLastSeenAt: lastSeen } });
            await api.setUserLastSeenAt(lastSeen);
        } catch {
            // Bỏ qua như bản gốc.
        }
    },

    async resolveConversation(): Promise<void> {
        await api.toggleStatus();
    },

    // ── conversationAttributes ────────────────────────────────────────────────
    async getConversationAttributes(): Promise<void> {
        try {
            const data = await api.fetchConversationAttributes();
            setState({
                conversationAttributes: { id: data?.id ?? '', status: data?.status ?? '' },
                meta: { userLastSeenAt: data?.contact_last_seen_at ?? state.meta.userLastSeenAt },
            });
        } catch {
            // Bỏ qua như bản gốc.
        }
    },

    updateConversationAttributes(data: ConversationAttributes): void {
        if (data.id !== state.conversationAttributes.id) return;
        setState({ conversationAttributes: { id: data.id, status: data.status } });
    },

    // ── custom attributes / labels (SDK) ──────────────────────────────────────
    async setConversationCustomAttributes(customAttributes: Record<string, unknown>): Promise<void> {
        if (!hasConversation()) {
            setState({ pendingCustomAttributes: { ...state.pendingCustomAttributes, ...customAttributes } });
            return;
        }
        try {
            await api.setConversationCustomAttributes(customAttributes);
        } catch {
            // Bỏ qua như bản gốc.
        }
    },

    async deleteConversationCustomAttribute(customAttribute: string): Promise<void> {
        if (!hasConversation()) {
            const { [customAttribute]: _removed, ...rest } = state.pendingCustomAttributes;
            setState({ pendingCustomAttributes: rest });
            return;
        }
        try {
            await api.deleteConversationCustomAttribute(customAttribute);
        } catch {
            // Bỏ qua như bản gốc.
        }
    },

    async createLabel(label: string): Promise<void> {
        if (!hasConversation()) {
            if (!state.pendingLabels.includes(label)) {
                setState({ pendingLabels: [...state.pendingLabels, label] });
            }
            return;
        }
        try {
            await api.createLabel(label);
        } catch {
            // Bỏ qua như bản gốc.
        }
    },

    async destroyLabel(label: string): Promise<void> {
        if (!hasConversation()) {
            setState({ pendingLabels: state.pendingLabels.filter(item => item !== label) });
            return;
        }
        try {
            await api.destroyLabel(label);
        } catch {
            // Bỏ qua như bản gốc.
        }
    },

    clearPendingConversationMetadata(): void {
        setState({ pendingCustomAttributes: {}, pendingLabels: [] });
    },

    // ── agent ─────────────────────────────────────────────────────────────────
    async fetchAvailableAgents(): Promise<void> {
        try {
            const { payload = [] } = await api.fetchAvailableAgents();
            setState({ agents: payload });
        } catch {
            setState({ agents: [] });
        }
    },

    // mutationHelpers.updatePresence: agent vắng trong map = offline.
    updateAgentsPresence(users: Record<string, string> | undefined): void {
        const presence = users ?? {};
        setState({
            agents: state.agents.map(agent => ({
                ...agent,
                availability_status: presence[String(agent.id)] ?? 'offline',
            })),
        });
    },

    // ── contact ───────────────────────────────────────────────────────────────
    async fetchContact(): Promise<void> {
        try {
            const contact = await api.fetchContact();
            setState({ contact: { ...(state.contact ?? {}), ...contact } as WidgetContact });
        } catch {
            // Bỏ qua như bản gốc.
        }
    },

    async updateContact(user: Record<string, unknown>): Promise<void> {
        try {
            await api.updateContact(user);
            await widgetStore.fetchContact();
        } catch {
            // Bỏ qua như bản gốc.
        }
    },

    async setContactUser({
        identifier,
        user,
    }: {
        identifier: string | number;
        user: Record<string, unknown>;
    }): Promise<void> {
        const {
            email,
            name,
            avatar_url: avatarUrl,
            identifier_hash: identifierHash,
            phone_number: phoneNumber,
            company_name: companyName,
            city,
            country_code: countryCode,
            description,
            custom_attributes: customAttributes,
            social_profiles: socialProfiles,
        } = user as Record<string, unknown>;

        try {
            const data = await api.setContactUser(identifier, {
                email,
                name,
                avatar_url: avatarUrl,
                identifier_hash: identifierHash,
                phone_number: phoneNumber,
                additional_attributes: {
                    company_name: companyName,
                    city,
                    description,
                    country_code: countryCode,
                    social_profiles: socialProfiles,
                },
                custom_attributes: customAttributes,
            });

            const widgetAuthToken = data?.widget_auth_token;
            if (widgetAuthToken) {
                setAuthToken(widgetAuthToken);
                IFrameHelper.sendMessage({ event: 'setAuthCookie', data: { widgetAuthToken } });
            }
            await widgetStore.fetchContact();
            if (identifierHash || widgetAuthToken) {
                widgetStore.clearConversations();
                await widgetStore.fetchOldConversations();
                await widgetStore.getConversationAttributes();
            }
        } catch (error) {
            IFrameHelper.sendMessage({
                event: 'error',
                errorType: 'SET_USER_ERROR',
                data: (error as { body?: unknown })?.body ?? null,
            });
        }
    },

    async setContactCustomAttributes(customAttributes: Record<string, unknown>): Promise<void> {
        try {
            await api.setContactCustomAttributes(customAttributes);
        } catch {
            // Bỏ qua như bản gốc.
        }
    },

    async deleteContactCustomAttribute(customAttribute: string): Promise<void> {
        try {
            await api.deleteContactCustomAttribute(customAttribute);
        } catch {
            // Bỏ qua như bản gốc.
        }
    },

    // ── message (form/email trong bong bóng bot) ──────────────────────────────
    async updateMessage({
        messageId,
        email,
        submittedValues,
    }: {
        messageId: number | string;
        email?: string;
        submittedValues?: unknown;
    }): Promise<void> {
        try {
            await api.updateMessage({ messageId, email, values: submittedValues });
            widgetStore.updateMessageContentAttributes(messageId, {
                submitted_email: email,
                submitted_values: email ? null : submittedValues,
            });
            await widgetStore.fetchContact();
        } catch {
            // Bỏ qua như bản gốc.
        }
    },

    async createEvent(name: string): Promise<void> {
        try {
            await api.createEvent(name);
        } catch {
            // Bỏ qua như bản gốc.
        }
    },
};

// Getter dùng nhiều chỗ — giữ tên như getters của bản gốc.
export const selectMessages = (widgetState: WidgetState): WidgetMessage[] =>
    Object.values(widgetState.conversations);

export const selectUnreadMessageCount = (widgetState: WidgetState): number =>
    getUnreadMessageCount(selectMessages(widgetState), widgetState.meta.userLastSeenAt);

export const notifyAgentMessageReceived = (): void => emitter.emit(WIDGET_BUS_EVENTS.ON_AGENT_MESSAGE_RECEIVED);
