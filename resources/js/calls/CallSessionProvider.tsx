import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { router } from '@inertiajs/react';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { useAlert } from 'dashboard/composables/useAlert';
import { conversationUrl } from 'dashboard/helper/URLHelper';
import { emitter } from 'shared/helpers/emitter';
import {
    acceptDirectCall,
    fetchCurrentDirectCall,
    fetchGroupRoom,
    hangUpDirectCall,
    joinGroupRoom,
    muteGroupRoomParticipant,
    removeGroupRoomParticipant,
    startDirectCall as requestDirectCall,
} from 'dashboard/calls/api';
import type { CallTicket, DirectCallJoinResponse, DirectCallPayload } from 'dashboard/calls/api';
import { CallSessionContext } from 'dashboard/calls/callSession';
import { userIdOfIdentity } from 'dashboard/calls/participantIdentity';
import type { CallSession, DirectCallState, JoinGroupRoomRequest, StartDirectCallRequest } from 'dashboard/calls/callSession';
import type { CallActions, CallLocalState, CallMediaKind, CallRoomPresentation, CallRoomView } from 'dashboard/calls/types';
import { t } from '../i18n';
import type { MediaSessionEnd, MediaSessionHandle, MediaSessionState } from './mediaSession';

// Lớp media chỉ tải khi vào phòng, để các trang khác không phải tải thư viện LiveKit.
const LiveKitSession = lazy(() => import('./LiveKitSession'));

const PHONE_MAX_WIDTH = 768;

const DIRECT_CALL_UPDATED = 'direct_call.updated';

// Phòng đang nối: phòng thoại nhóm (có `groupId`) hoặc cuộc gọi 1-1.
interface ActiveCall {
    callId: number;
    accountId: number;
    title: string;
    conversationUrl: string;
    startedAt: string;
    ticket: CallTicket;
    groupId: number | null;
    canModerate: boolean;
    // Vào phòng gọi video thì bật camera ngay khi nối.
    startsWithCamera: boolean;
}

const END_MESSAGES: Record<MediaSessionEnd, string | null> = {
    left: null,
    removed: 'CALLS.ROOM.REMOVED_YOU',
    replaced: 'CALLS.ROOM.JOINED_ELSEWHERE',
    closed: 'CALLS.ROOM.ROOM_CLOSED',
    full: 'CALLS.ROOM.ROOM_FULL_NOW',
    lost: 'CALLS.ROOM.CONNECTION_LOST',
};

const EMPTY_MEDIA: MediaSessionState = { participants: [], renderMedia: () => null, readAudioLevel: () => 0 };

const LIVE_DIRECT_STATUSES = ['ringing', 'active'];

// Người gọi đang đợi mà bên kia không bắt máy: báo bằng toast, vì dải đang gọi biến mất ngay và tin
// nhật ký chỉ nằm trong hội thoại (người gọi có thể đang ở trang khác).
const CALLER_UNANSWERED_MESSAGES: Record<string, string> = {
    declined: 'CALLS.DIRECT.PEER_DECLINED',
    missed: 'CALLS.DIRECT.PEER_NO_ANSWER',
};

const GROUP_ROOM_PRESENTATION: CallRoomPresentation = { icon: 'i-lucide-headphones', expandLabel: 'CALLS.ROOM.EXPAND', leaveLabel: 'CALLS.ROOM.LEAVE' };
const DIRECT_CALL_PRESENTATION: CallRoomPresentation = { icon: 'i-lucide-phone', expandLabel: 'CALLS.DIRECT.EXPAND', leaveLabel: 'CALLS.DIRECT.END' };

const canShareScreen = () =>
    typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia) && window.innerWidth >= PHONE_MAX_WIDTH;

const directConversationUrl = ({ account_id, call }: DirectCallPayload) => conversationUrl({ accountId: account_id, id: call.conversation_id });

// Phiên gọi của người dùng, đặt ở gốc app Inertia: chuyển trang thì trang đổi nhưng phiên
// (kết nối, âm thanh) giữ nguyên. Giao diện đọc qua useCallSession().
export default function CallSessionProvider({ children }: { children: ReactNode }) {
    const [active, setActive] = useState<ActiveCall | null>(null);
    const [direct, setDirect] = useState<DirectCallState | null>(null);
    const [isJoining, setJoining] = useState(false);
    const [stageOpen, setStageOpen] = useState(false);
    const [deafened, setDeafened] = useState(false);
    const [isMicStarting, setMicStarting] = useState(false);
    const [media, setMedia] = useState<MediaSessionState>(EMPTY_MEDIA);
    const handleRef = useRef<MediaSessionHandle | null>(null);

    const self = media.participants.find(participant => participant.isLocal) ?? null;

    const activeRef = useRef<ActiveCall | null>(null);
    activeRef.current = active;
    const directRef = useRef<DirectCallState | null>(null);
    directRef.current = direct;
    // Cuộc 1-1 gần nhất của tab này: phòng có thể đóng (xoá `direct`) trước khi sự kiện kết cục tới.
    const lastDirectCallIdRef = useRef<number | null>(null);
    if (direct) lastDirectCallIdRef.current = direct.view.id;

    const endCall = useCallback(() => {
        handleRef.current = null;
        setActive(null);
        setStageOpen(false);
        setDeafened(false);
        setMicStarting(false);
        setMedia(EMPTY_MEDIA);
    }, []);

    const runOnMedia = useCallback((operation: (handle: MediaSessionHandle) => Promise<void>) => {
        const handle = handleRef.current;
        if (!handle) return;
        operation(handle).catch(() => useAlert(t('CALLS.ROOM.DEVICE_BLOCKED')));
    }, []);

    const onReady = useCallback(
        (handle: MediaSessionHandle) => {
            handleRef.current = handle;
            setMicStarting(true);
            runOnMedia(ready => ready.setMicrophone(true).finally(() => setMicStarting(false)));
            if (activeRef.current?.startsWithCamera) runOnMedia(ready => ready.setCamera(true));
        },
        [runOnMedia],
    );

    const onEnded = useCallback(
        (reason: MediaSessionEnd) => {
            const endedCall = activeRef.current;
            endCall();

            // Cuộc 1-1 đóng phòng vì một bên đã cúp: trạng thái cuối đến qua sự kiện, không báo lỗi.
            if (endedCall?.groupId === null) {
                setDirect(null);
                return;
            }

            // Bị đưa ra vì đã rời nhóm (kể cả từ thiết bị khác) khác với bị quản trị mời ra: hỏi
            // lại máy chủ xem mình còn trong nhóm không.
            if (reason === 'removed' && endedCall?.groupId) {
                fetchGroupRoom(endedCall.accountId, endedCall.groupId)
                    .then(() => useAlert(t('CALLS.ROOM.REMOVED_YOU')))
                    .catch(() => useAlert(t('CALLS.ROOM.LEFT_GROUP')));
                return;
            }

            const message = END_MESSAGES[reason];
            if (message) useAlert(t(message));
        },
        [endCall],
    );

    const showApiError = (error: unknown) => useAlert(parseApiErrorMessage(error) ?? t('CALLS.ROOM.CONNECTION_LOST'));

    const joinGroup = useCallback(
        (request: JoinGroupRoomRequest) => {
            if (active?.groupId === request.groupId) {
                setStageOpen(true);
                return;
            }

            setJoining(true);
            joinGroupRoom(request.accountId, request.groupId)
                .then(response => {
                    if (!response.ticket) return;
                    handleRef.current = null;
                    setMedia(EMPTY_MEDIA);
                    setActive({
                        callId: response.call.id,
                        accountId: request.accountId,
                        title: request.title,
                        conversationUrl: request.conversationUrl,
                        startedAt: response.call.started_at ?? new Date().toISOString(),
                        ticket: response.ticket,
                        groupId: request.groupId,
                        canModerate: request.canModerate,
                        startsWithCamera: false,
                    });
                    setStageOpen(true);
                })
                .catch(showApiError)
                .finally(() => setJoining(false));
        },
        [active?.groupId],
    );

    // Vé 1-1 (người gọi lúc bắt đầu, người nhận lúc nghe máy): nối phòng và ghi trạng thái cuộc gọi.
    const connectDirect = useCallback((response: DirectCallJoinResponse, media: CallMediaKind, isExpanded: boolean) => {
        const payload = response.direct_call;
        setDirect({ view: payload.call, accountId: payload.account_id, isExpanded });
        if (!response.ticket) return;

        handleRef.current = null;
        setMedia(EMPTY_MEDIA);
        setActive({
            callId: payload.call.id,
            accountId: payload.account_id,
            title: payload.call.peer.name,
            conversationUrl: directConversationUrl(payload),
            startedAt: payload.call.answered_at ?? new Date().toISOString(),
            ticket: response.ticket,
            groupId: null,
            canModerate: false,
            startsWithCamera: media === 'video',
        });
        setStageOpen(payload.call.status === 'active');
    }, []);

    const startDirect = useCallback(
        ({ accountId, conversation, media }: StartDirectCallRequest) => {
            // Bấm gọi lại đúng người đang gọi dở: mở lại màn gọi chứ không báo bận.
            const current = directRef.current;
            if (current && current.view.conversation_id === conversation.id) {
                setDirect({ ...current, isExpanded: true });
                if (current.view.status === 'active') setStageOpen(true);
                return;
            }

            if (activeRef.current || current) {
                useAlert(t('CALLS.ERRORS.YOU_BUSY'));
                return;
            }

            setJoining(true);
            requestDirectCall(accountId, conversation.id, media)
                .then(response => connectDirect(response, media, false))
                .catch(showApiError)
                .finally(() => setJoining(false));
        },
        [connectDirect],
    );

    const recoverDirect = useCallback((accountId: number) => {
        fetchCurrentDirectCall(accountId)
            .then(({ direct_call: payload }) => {
                // Chỉ cuộc đang đổ chuông tới mình mới nối lại được. Cuộc mình gọi đi hay đang nói thì
                // phòng đã rớt khi tải lại, máy chủ tự huỷ hoặc kết thúc theo sự kiện phòng.
                if (!payload || payload.call.status !== 'ringing' || payload.call.role !== 'callee') return;
                if (directRef.current || activeRef.current) return;
                setDirect({ view: payload.call, accountId: payload.account_id, isExpanded: false });
            })
            .catch(() => undefined);
    }, []);

    const hangUpDirect = useCallback(() => {
        const current = directRef.current;
        if (!current) return;

        setDirect(null);
        if (activeRef.current?.groupId === null) endCall();
        hangUpDirectCall(current.accountId, current.view.id).catch(() => undefined);
    }, [endCall]);

    // Sự kiện từ máy chủ, cho mọi tab của mình: có người gọi đến, người kia nghe máy, cuộc gọi xong.
    useEffect(() => {
        const onDirectCallUpdated = (payload: unknown) => {
            const { account_id: accountId, call } = payload as DirectCallPayload;
            const current = directRef.current;
            const isCurrent = current?.view.id === call.id;
            const isConnectedHere = activeRef.current?.groupId === null && activeRef.current.callId === call.id;

            if (!LIVE_DIRECT_STATUSES.includes(call.status)) {
                if (lastDirectCallIdRef.current === call.id) {
                    lastDirectCallIdRef.current = null;
                    const unansweredMessage = call.role === 'caller' ? CALLER_UNANSWERED_MESSAGES[call.status] : undefined;
                    if (unansweredMessage) useAlert(t(unansweredMessage, { name: call.peer.name }));
                }
                if (!isCurrent) return;
                setDirect(null);
                if (isConnectedHere) endCall();
                return;
            }

            if (call.status === 'ringing' && call.role === 'callee') {
                // Đang bận cuộc khác thì không đổ chuông ở đây; máy chủ đã chặn trường hợp này.
                if (!current && !activeRef.current) setDirect({ view: call, accountId, isExpanded: false });
                return;
            }

            if (!isCurrent) return;

            // Người nhận nghe máy ở tab/thiết bị khác: tab này thôi đổ chuông.
            if (call.role === 'callee' && !isConnectedHere) {
                setDirect(null);
                return;
            }

            setDirect(state => (state ? { ...state, view: call } : state));
            // Người kia vừa nghe máy: người gọi chuyển từ dải đang gọi sang màn gọi.
            if (call.status === 'active' && call.answered_at && current?.view.status === 'ringing') {
                setActive(state => (state && state.callId === call.id ? { ...state, startedAt: call.answered_at ?? state.startedAt } : state));
                setStageOpen(true);
            }
        };

        emitter.on(DIRECT_CALL_UPDATED, onDirectCallUpdated);
        return () => emitter.off(DIRECT_CALL_UPDATED, onDirectCallUpdated);
    }, [endCall]);

    const directActions = useMemo(
        () => ({
            accept: (media: CallMediaKind) => {
                const current = directRef.current;
                if (!current) return;
                setJoining(true);
                acceptDirectCall(current.accountId, current.view.id, media)
                    .then(response => connectDirect(response, media, true))
                    .catch(error => {
                        setDirect(null);
                        showApiError(error);
                    })
                    .finally(() => setJoining(false));
            },
            hangUp: hangUpDirect,
            expand: () => {
                setDirect(state => (state ? { ...state, isExpanded: true } : state));
                if (activeRef.current?.groupId === null && directRef.current?.view.status === 'active') setStageOpen(true);
            },
            collapse: () => {
                setDirect(state => (state ? { ...state, isExpanded: false } : state));
                setStageOpen(false);
            },
        }),
        [connectDirect, hangUpDirect],
    );

    const moderate = useCallback(
        (identity: string, request: (accountId: number, groupId: number, userId: number) => Promise<unknown>) => {
            const userId = userIdOfIdentity(identity);
            if (!active?.groupId || userId === null) return;
            request(active.accountId, active.groupId, userId).catch(showApiError);
        },
        [active],
    );

    const actions: CallActions = useMemo(
        () => ({
            toggleMic: () => runOnMedia(handle => handle.setMicrophone(!self?.micOn)),
            toggleCamera: () => runOnMedia(handle => handle.setCamera(!self?.camOn)),
            toggleScreen: () => runOnMedia(handle => handle.setScreenShare(!self?.isSharingScreen)),
            toggleDeafen: () => setDeafened(current => !current),
            listDevices: kind => handleRef.current?.listDevices(kind) ?? Promise.resolve([]),
            selectDevice: (kind, deviceId) => runOnMedia(handle => handle.selectDevice(kind, deviceId)),
            // Rời cuộc 1-1 là cúp máy cho cả hai; rời phòng nhóm chỉ là mình ra.
            leave: () => (active?.groupId === null ? hangUpDirect() : endCall()),
            expand: () => setStageOpen(true),
            minimize: () => {
                setStageOpen(false);
                setDirect(state => (state ? { ...state, isExpanded: false } : state));
            },
            openChat: () => {
                setStageOpen(false);
                setDirect(state => (state ? { ...state, isExpanded: false } : state));
                if (active) router.visit(active.conversationUrl, { preserveState: true });
            },
            muteParticipant: identity => moderate(identity, muteGroupRoomParticipant),
            removeParticipant: identity => moderate(identity, removeGroupRoomParticipant),
        }),
        [active, endCall, hangUpDirect, moderate, runOnMedia, self?.camOn, self?.isSharingScreen, self?.micOn],
    );

    // Cuộc 1-1 còn đổ chuông thì chưa là "phòng đã kết nối": khối Đã kết nối chỉ hiện khi đã nghe máy.
    const isRingingDirect = active?.groupId === null && direct?.view.status === 'ringing';
    const room: CallRoomView | null = active && !isRingingDirect
        ? {
              callId: active.callId,
              title: active.title,
              conversationUrl: active.conversationUrl,
              startedAt: active.startedAt,
              participants: media.participants,
              presentation: active.groupId === null ? DIRECT_CALL_PRESENTATION : GROUP_ROOM_PRESENTATION,
          }
        : null;

    const local: CallLocalState = {
        micOn: self?.micOn ?? false,
        micStarting: isMicStarting || self === null,
        camOn: self?.camOn ?? false,
        sharingScreen: self?.isSharingScreen ?? false,
        deafened,
        canShareScreen: active?.groupId != null && canShareScreen(),
        canModerate: active?.canModerate ?? false,
    };

    const session: CallSession = {
        room,
        local,
        stageOpen: Boolean(active) && stageOpen,
        isJoining,
        groupId: active?.groupId ?? null,
        sharer: media.participants.find(participant => participant.isSharingScreen) ?? null,
        actions,
        renderMedia: media.renderMedia,
        joinGroupRoom: joinGroup,
        startDirectCall: startDirect,
        recoverDirectCall: recoverDirect,
        direct,
        directActions,
        selfIdentity: self?.identity ?? null,
        readAudioLevel: media.readAudioLevel,
    };

    return (
        <CallSessionContext.Provider value={session}>
            {children}
            {active ? (
                <Suspense fallback={null}>
                    <LiveKitSession
                        key={active.ticket.token}
                        serverUrl={active.ticket.server_url}
                        token={active.ticket.token}
                        deafened={deafened}
                        onState={setMedia}
                        onReady={onReady}
                        onEnded={onEnded}
                    />
                </Suspense>
            ) : null}
        </CallSessionContext.Provider>
    );
}
