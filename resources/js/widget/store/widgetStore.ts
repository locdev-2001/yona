import * as api from '../api/widget';
import { getWebsiteToken, setAuthToken, WidgetApiError } from '../api/client';
import {
    AGENT_TYPING_TIMEOUT,
    CAMPAIGN_CACHE_EXPIRY,
    CAMPAIGN_CACHE_KEY_PREFIX,
    MESSAGE_TYPE,
    WIDGET_BUS_EVENTS,
} from '../helpers/constants';
import { emitter } from 'shared/helpers/emitter';
import { getFromCache, setCache } from 'shared/helpers/cache';
import { campaignTimer } from '../helpers/campaignTimer';
import { filterCampaigns, formatCampaigns } from '../helpers/campaignHelper';
import { IFrameHelper } from '../helpers/iframe';
import {
    createTemporaryMessage,
    findUndeliveredMessage,
    getUnreadMessageCount,
} from '../helpers/messageHelpers';
import { t } from '../i18n';
import type {
    AppConfig,
    AvailableAgent,
    ChannelConfig,
    ChannelMessagingPolicy,
    ConversationAttributes,
    MessageAttachment,
    WidgetCampaign,
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
    pendingContactCustomAttributes: Record<string, unknown>;
    pendingLabels: string[];
    agents: AvailableAgent[];
    conversationAttributes: ConversationAttributes;
    banner: BannerState | null;
    campaigns: WidgetCampaign[];
    activeCampaign: WidgetCampaign | null;
    campaignsFetched: boolean;
    messagingPolicy: ChannelMessagingPolicy;
    agentLastSeenAt: number;
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
    pendingContactCustomAttributes: {},
    pendingLabels: [],
    agents: [],
    conversationAttributes: { id: '', status: '' },
    banner: null,
    campaigns: [],
    activeCampaign: null,
    campaignsFetched: false,
    // Hạn 0 = chưa biết chính sách của kênh, chưa hiện mục thu hồi.
    messagingPolicy: { recallWindowSeconds: 0, stickers: [] },
    agentLastSeenAt: 0,
};

type Listener = () => void;
const listeners = new Set<Listener>();

function setState(patch: Partial<WidgetState>): void {
    state = { ...state, ...patch };
    listeners.forEach(listener => listener());
}

let bannerTimer: ReturnType<typeof setTimeout> | null = null;
let agentTypingTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectPromise: Promise<void> | null = null;

const hasConversation = () => Boolean(state.conversationAttributes.id);
const hasContact = () => Boolean(state.contact?.id);

const hasPendingMetadata = () =>
    Object.keys(state.pendingCustomAttributes).length > 0 || state.pendingLabels.length > 0;

const pendingMetadata = () =>
    hasPendingMetadata()
        ? { customAttributes: state.pendingCustomAttributes, labels: state.pendingLabels }
        : {};


const previewUrlOf = (file: File): string =>
    typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : '';

const attachmentPreviewOf = (file: File): MessageAttachment => {
    const previewUrl = previewUrlOf(file);
    return {
        thumb_url: previewUrl,
        data_url: previewUrl,
        file_type: file.type.startsWith('image/') ? 'image' : 'file',
        file_size: file.size,
        status: 'in_progress',
        progress: 0,
    };
};

// Một yêu cầu chở nhiều tệp nên chỉ có tổng số byte đã tải; quy về từng tệp theo
// thứ tự gửi: tệp trước đầy rồi tệp sau mới chạy.
export const splitProgressAcrossFiles = (loadedBytes: number, fileSizes: number[]): number[] => {
    let remainingBytes = loadedBytes;
    return fileSizes.map(size => {
        if (size <= 0) return 100;
        const consumedBytes = Math.max(0, Math.min(size, remainingBytes));
        remainingBytes -= consumedBytes;
        return Math.round((consumedBytes / size) * 100);
    });
};

function patchMessage(messageId: number | string, patch: (message: WidgetMessage) => WidgetMessage): void {
    const message = state.conversations[messageId];
    if (!message) return;
    setState({ conversations: { ...state.conversations, [messageId]: patch(message) } });
}

function replaceTemporaryMessage(temporaryId: number | string, message: WidgetMessage): void {
    const conversations = { ...state.conversations };
    delete conversations[temporaryId];
    setState({ conversations });
    pushMessageToConversation(message);
}

// Một lần gửi tin của khách: `request` gọi máy chủ với metadata hội thoại đang chờ
// (sticker không mang metadata). Gửi hỏng thì giữ nguyên `OutgoingSend` trong bộ nhớ
// theo id tin tạm để "Thử lại" gửi đúng chữ, tệp và tin được trả lời; File không
// serialize được nên tải lại trang là mất và nút "Thử lại" ẩn đi.
interface OutgoingSend {
    temporaryMessage: WidgetMessage;
    carriesPendingMetadata: boolean;
    request: (metadata: ReturnType<typeof pendingMetadata>) => Promise<WidgetMessage>;
}

interface FailedSend {
    send: OutgoingSend;
    isNetworkFailure: boolean;
}

const failedSends = new Map<number | string, FailedSend>();

// Không có phản hồi (mất mạng) hoặc máy chủ lỗi 5xx: gửi lại có cơ hội thành công.
const isNetworkFailure = (error: unknown): boolean =>
    !(error instanceof WidgetApiError) || error.status === 0 || error.status >= 500;

async function deliverOutgoingMessage(send: OutgoingSend): Promise<void> {
    const { temporaryMessage, carriesPendingMetadata, request } = send;
    failedSends.delete(temporaryMessage.id);
    pushMessageToConversation({ ...temporaryMessage, status: 'in_progress' });
    const metadata = carriesPendingMetadata ? pendingMetadata() : {};

    try {
        const data = await request(metadata);
        if (carriesPendingMetadata && hasPendingMetadata()) widgetStore.clearPendingConversationMetadata();
        replaceTemporaryMessage(temporaryMessage.id, { ...data, status: data.status ?? 'sent' });
        void widgetStore.reconnectRealtimeIfPending();
    } catch (error) {
        if (!state.conversations[temporaryMessage.id]) return;
        failedSends.set(temporaryMessage.id, { send, isNetworkFailure: isNetworkFailure(error) });
        patchMessage(temporaryMessage.id, () => ({
            ...temporaryMessage,
            status: 'failed',
            attachments: temporaryMessage.attachments?.map(attachment => ({ ...attachment, status: 'failed' })),
        }));
    }
}

async function sendAttachmentMessage({
    files,
    previews,
    caption,
    replyTo,
    onProgress,
}: {
    files: (File | string)[];
    previews: MessageAttachment[];
    caption: string;
    replyTo: number | string | null;
    onProgress?: (fileIndex: number, percent: number) => void;
}): Promise<void> {
    const temporaryMessage = createTemporaryMessage({ content: caption || undefined, attachments: previews, replyTo });

    const fileSizes = previews.map(preview => preview.file_size ?? 0);
    const reportProgress = (loadedBytes: number) => {
        const percents = splitProgressAcrossFiles(loadedBytes, fileSizes);
        percents.forEach((percent, fileIndex) => onProgress?.(fileIndex, percent));
        patchMessage(temporaryMessage.id, message => ({
            ...message,
            attachments: message.attachments?.map((attachment, index) => ({
                ...attachment,
                progress: percents[index] ?? attachment.progress,
            })),
        }));
    };

    await deliverOutgoingMessage({
        temporaryMessage,
        carriesPendingMetadata: true,
        request: metadata => api.sendAttachments({ files, caption, replyTo }, metadata, reportProgress),
    });
}

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
            pendingContactCustomAttributes: {},
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

    setMessagingPolicy(messagingPolicy: ChannelMessagingPolicy): void {
        setState({ messagingPolicy });
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
    // conversation/actions.js#createConversation — form tiền chat gửi thông tin
    // khách + tin đầu trong CÙNG một yêu cầu (tránh đua với việc gộp liên hệ).
    async createConversation(params: {
        fullName?: string;
        emailAddress?: string;
        phoneNumber?: string;
        message?: string;
        contactCustomAttributes?: Record<string, unknown>;
        customAttributes?: Record<string, unknown>;
    }): Promise<void> {
        setState({ uiFlags: { ...state.uiFlags, isCreating: true } });
        try {
            const data = await api.createConversation(params);
            const [message] = data?.messages ?? [];
            if (message) pushMessageToConversation(message);
            await widgetStore.getConversationAttributes();
            await widgetStore.reconnectRealtimeIfPending();
            emitter.emit(WIDGET_BUS_EVENTS.ON_CONVERSATION_CREATED);
        } catch {
            // Bỏ qua như bản gốc.
        } finally {
            setState({ uiFlags: { ...state.uiFlags, isCreating: false } });
        }
    },

    async fetchOldConversations({ before }: { before?: number | string } = {}): Promise<void> {
        try {
            setState({ uiFlags: { ...state.uiFlags, isFetchingList: true } });
            const { payload, meta } = await api.fetchMessages({ before });
            const messages = payload ?? [];
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
            const messages = payload ?? [];
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
        await deliverOutgoingMessage({
            temporaryMessage: message,
            carriesPendingMetadata: true,
            request: metadata => api.sendMessage(message.content ?? '', message.replyTo ?? null, metadata),
        });
    },

    // Đường một tệp cũ của ô nhập: cùng một đường với nhiều tệp, mảng một phần tử.
    async sendAttachment({
        attachment,
        replyTo = null,
    }: {
        attachment: { file: File | string; thumbUrl: string; fileType: string };
        replyTo?: number | string | null;
    }): Promise<void> {
        const preview =
            typeof attachment.file === 'string'
                ? { thumb_url: attachment.thumbUrl, data_url: attachment.thumbUrl, file_type: attachment.fileType, status: 'in_progress' }
                : attachmentPreviewOf(attachment.file);
        await sendAttachmentMessage({ files: [attachment.file], previews: [preview], caption: '', replyTo });
    },

    // Nhiều tệp gộp thành MỘT tin kèm chú thích; tiến trình báo theo từng tệp.
    async sendAttachments({
        files,
        caption = '',
        replyTo = null,
        onProgress,
    }: {
        files: File[];
        caption?: string;
        replyTo?: number | string | null;
        onProgress?: (fileIndex: number, percent: number) => void;
    }): Promise<void> {
        if (!files.length) return;
        await sendAttachmentMessage({ files, previews: files.map(attachmentPreviewOf), caption, replyTo, onProgress });
    },

    async sendSticker({ stickerId, replyTo = null }: { stickerId: string; replyTo?: number | string | null }): Promise<void> {
        const temporaryMessage = createTemporaryMessage({
            contentType: 'sticker',
            contentAttributes: { sticker: stickerId },
            replyTo,
        });
        await deliverOutgoingMessage({
            temporaryMessage,
            carriesPendingMetadata: false,
            request: () => api.sendSticker(stickerId, replyTo),
        });
    },

    // Gửi lại tin hỏng ngay tại chỗ (không tạo tin mới) bằng đúng payload đã giữ.
    async retryMessage(messageId: number | string): Promise<void> {
        const failedSend = failedSends.get(messageId);
        if (!failedSend || state.conversations[messageId]?.status !== 'failed') return;
        await deliverOutgoingMessage(failedSend.send);
    },

    // Chỉ tin hỏng còn payload trong bộ nhớ mới gửi lại được.
    retryableFailureOf(messageId: number | string): Pick<FailedSend, 'isNetworkFailure'> | undefined {
        return failedSends.get(messageId);
    },

    // Máy chủ quyết định được thu hồi hay không; thành công thì đánh dấu tại chỗ để
    // bong bóng nét đứt hiện ngay, không đợi realtime.
    async recallMessage(messageId: number | string): Promise<void> {
        try {
            await api.recallMessage(messageId);
            patchMessage(messageId, message => ({ ...message, content_attributes: { deleted: true }, attachments: [] }));
        } catch (error) {
            const code = error instanceof WidgetApiError ? (error.body as { code?: string } | null)?.code : undefined;
            widgetStore.showBanner({
                message: code === 'recall_window_expired' ? t('RECALL.EXPIRED') : t('RECALL.FAILED'),
                type: 'error',
            });
            throw error;
        }
    },

    // Tin bị thu hồi ở lại danh sách thành bong bóng nét đứt cho cả hai bên.
    addOrUpdateMessage(message: WidgetMessage): void {
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
        failedSends.clear();
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
                agentLastSeenAt: data?.agent_last_seen_at ?? state.agentLastSeenAt,
            });
        } catch {
            // Bỏ qua như bản gốc.
        }
    },

    clearConversationAttributes(): void {
        setState({ conversationAttributes: { id: '', status: '' } });
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

    // Phiên còn "treo" lúc /config (chưa có hành động thật) không mang pubsub_token
    // thật — sau hành động thật đầu tiên (tin, hội thoại, campaign, gắn định danh),
    // đọc lại /contact (đã có contact_inbox thật, cùng auth token) để lấy
    // pubsub_token, báo main.tsx nối kênh realtime, rồi bù mọi tin/trạng thái lỡ tới
    // trong lúc kênh chưa nối và gửi nốt custom attributes contact đã xếp hàng.
    async reconnectRealtimeIfPending(): Promise<void> {
        if (state.contact?.pubsub_token) return;
        if (reconnectPromise) return reconnectPromise;

        reconnectPromise = (async () => {
            try {
                const contact = await api.fetchContact();
                if (!contact?.pubsub_token) return;

                setState({ contact: { ...(state.contact ?? {}), ...contact } as WidgetContact });
                emitter.emit(WIDGET_BUS_EVENTS.ON_REALTIME_TOKEN_READY, contact.pubsub_token);
                await widgetStore.syncLatestMessages();
                await widgetStore.getConversationAttributes();
                await widgetStore.flushPendingContactCustomAttributes();
            } catch {
                // Bỏ qua như bản gốc: thử lại ở hành động kế tiếp.
            } finally {
                reconnectPromise = null;
            }
        })();

        return reconnectPromise;
    },

    async flushPendingContactCustomAttributes(): Promise<void> {
        if (!Object.keys(state.pendingContactCustomAttributes).length) return;

        const pending = state.pendingContactCustomAttributes;
        setState({ pendingContactCustomAttributes: {} });
        try {
            await api.setContactCustomAttributes(pending);
        } catch {
            setState({ pendingContactCustomAttributes: { ...pending, ...state.pendingContactCustomAttributes } });
        }
    },

    async updateContact(user: Record<string, unknown>): Promise<void> {
        try {
            await api.updateContact(user);
            await widgetStore.fetchContact();
            await widgetStore.reconnectRealtimeIfPending();
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
            await widgetStore.reconnectRealtimeIfPending();
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

    // SDK gọi hàm này ở mỗi lần tải trang để đồng bộ dữ liệu phiên — KHÔNG được
    // dựng contact chỉ vì cuộc gọi này (ngược với chủ đích lazy contact). Phiên
    // còn treo thì giữ tại chỗ, gửi kèm khi contact thật xuất hiện (xem
    // reconnectRealtimeIfPending/flushPendingContactCustomAttributes).
    async setContactCustomAttributes(customAttributes: Record<string, unknown>): Promise<void> {
        if (!hasContact()) {
            setState({
                pendingContactCustomAttributes: { ...state.pendingContactCustomAttributes, ...customAttributes },
            });
            return;
        }
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

    // ── campaign ──────────────────────────────────────────────────────────────
    // store/modules/campaign.js — MỘT chỗ quyết định campaign nào được hẹn giờ:
    // lọc theo URL hiện tại + cửa sổ giờ làm việc rồi giao cho campaignTimer.
    resetCampaignTimers(currentURL: string, isInBusinessHours: boolean): void {
        const matched = filterCampaigns({
            campaigns: formatCampaigns({ campaigns: state.campaigns }),
            currentURL,
            isInBusinessHours,
        });
        campaignTimer.initTimers(matched, campaignId => void widgetStore.startCampaign(campaignId));
    },

    async fetchCampaigns(currentURL: string, isInBusinessHours: boolean): Promise<void> {
        const cacheKey = `${CAMPAIGN_CACHE_KEY_PREFIX}${getWebsiteToken()}`;
        const cached = getFromCache<WidgetCampaign[]>(cacheKey, CAMPAIGN_CACHE_EXPIRY);

        if (cached) {
            setState({ campaigns: cached, campaignsFetched: true });
            widgetStore.resetCampaignTimers(currentURL, isInBusinessHours);
            return;
        }

        try {
            const campaigns = await api.fetchCampaigns();
            setCache(cacheKey, campaigns);
            setState({ campaigns, campaignsFetched: true });
            widgetStore.resetCampaignTimers(currentURL, isInBusinessHours);
        } catch {
            // Bỏ qua như bản gốc (uiFlags.isError chỉ để debug, không hiện ra UI).
        }
    },

    // Trang SPA đổi URL liên tục: chỉ gọi API lần đầu, các lần sau hẹn lại giờ
    // trên danh sách đã có.
    initCampaigns(currentURL: string, isInBusinessHours: boolean): void {
        if (state.campaigns.length) {
            widgetStore.resetCampaignTimers(currentURL, isInBusinessHours);
            return;
        }

        if (!state.campaignsFetched) {
            void widgetStore.fetchCampaigns(currentURL, isInBusinessHours);
        }
    },

    // Hết giờ ở trang: chỉ nhả khi widget đang đóng, và luôn đọc lại danh sách
    // từ server để campaign vừa bị tắt không bắn nữa.
    async startCampaign(campaignId: number): Promise<void> {
        if (state.appConfig.isWidgetOpen) return;

        try {
            const campaigns = await api.fetchCampaigns();
            const campaign = campaigns.find(item => item.id === campaignId);
            if (campaign) setState({ activeCampaign: campaign });
        } catch {
            // Bỏ qua như bản gốc.
        }
    },

    async executeCampaign(campaignId: number, customAttributes?: Record<string, unknown>): Promise<void> {
        setState({ uiFlags: { ...state.uiFlags, isCreating: true } });
        try {
            await api.triggerCampaign(campaignId, customAttributes);
            setState({ activeCampaign: null });
            // campaign.triggered có thể vừa dựng contact/hội thoại lazy — nối realtime
            // và bù ngay tin campaign vừa gửi trước khi kênh kịp subscribe.
            await widgetStore.reconnectRealtimeIfPending();
        } catch {
            // Bỏ qua như bản gốc.
        } finally {
            setState({ uiFlags: { ...state.uiFlags, isCreating: false } });
        }
    },

    resetCampaign(): void {
        setState({ activeCampaign: null });
    },

    async createEvent(name: string): Promise<void> {
        try {
            await api.createEvent(name);
        } catch {
            // Bỏ qua như bản gốc.
        }
    },
};

api.onConfigLoaded(({ website_channel_config: channelPayload }) => {
    widgetStore.setMessagingPolicy({
        recallWindowSeconds: channelPayload.recall_window ?? 0,
        stickers: channelPayload.stickers ?? [],
    });
});

// Getter dùng nhiều chỗ — giữ tên như getters của bản gốc.
export const selectMessages = (widgetState: WidgetState): WidgetMessage[] =>
    Object.values(widgetState.conversations);

export const selectUnreadMessageCount = (widgetState: WidgetState): number =>
    getUnreadMessageCount(selectMessages(widgetState), widgetState.meta.userLastSeenAt);

export const notifyAgentMessageReceived = (): void => emitter.emit(WIDGET_BUS_EVENTS.ON_AGENT_MESSAGE_RECEIVED);
