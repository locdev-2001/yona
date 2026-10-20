import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { router } from '@inertiajs/react';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { useAlert } from 'dashboard/composables/useAlert';
import { joinGroupRoom, muteGroupRoomParticipant, removeGroupRoomParticipant } from 'dashboard/calls/api';
import type { CallTicket } from 'dashboard/calls/api';
import { CallSessionContext } from 'dashboard/calls/callSession';
import { userIdOfIdentity } from 'dashboard/calls/participantIdentity';
import type { CallSession, JoinGroupRoomRequest } from 'dashboard/calls/callSession';
import type { CallActions, CallLocalState, CallRoomView } from 'dashboard/calls/types';
import { t } from '../i18n';
import type { MediaSessionEnd, MediaSessionHandle, MediaSessionState } from './mediaSession';

// Lớp media chỉ tải khi vào phòng, để các trang khác không phải tải thư viện LiveKit.
const LiveKitSession = lazy(() => import('./LiveKitSession'));

const PHONE_MAX_WIDTH = 768;

interface ActiveCall {
    request: JoinGroupRoomRequest;
    callId: number;
    startedAt: string;
    ticket: CallTicket;
}

const END_MESSAGES: Record<MediaSessionEnd, string | null> = {
    left: null,
    removed: 'CALLS.ROOM.REMOVED_YOU',
    replaced: 'CALLS.ROOM.JOINED_ELSEWHERE',
    closed: 'CALLS.ROOM.ROOM_CLOSED',
    lost: 'CALLS.ROOM.CONNECTION_LOST',
};

const EMPTY_MEDIA: MediaSessionState = { participants: [], renderMedia: () => null };

const canShareScreen = () =>
    typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia) && window.innerWidth >= PHONE_MAX_WIDTH;


// Phiên gọi của người dùng, đặt ở gốc app Inertia: chuyển trang thì trang đổi nhưng phiên
// (kết nối, âm thanh) giữ nguyên. Giao diện đọc qua useCallSession().
export default function CallSessionProvider({ children }: { children: ReactNode }) {
    const [active, setActive] = useState<ActiveCall | null>(null);
    const [isJoining, setJoining] = useState(false);
    const [stageOpen, setStageOpen] = useState(false);
    const [deafened, setDeafened] = useState(false);
    const [media, setMedia] = useState<MediaSessionState>(EMPTY_MEDIA);
    const handleRef = useRef<MediaSessionHandle | null>(null);

    const self = media.participants.find(participant => participant.isLocal) ?? null;

    const endCall = useCallback(() => {
        handleRef.current = null;
        setActive(null);
        setStageOpen(false);
        setDeafened(false);
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
            runOnMedia(ready => ready.setMicrophone(true));
        },
        [runOnMedia],
    );

    const onEnded = useCallback(
        (reason: MediaSessionEnd) => {
            endCall();
            const message = END_MESSAGES[reason];
            if (message) useAlert(t(message));
        },
        [endCall],
    );

    const joinGroup = useCallback(
        (request: JoinGroupRoomRequest) => {
            if (active?.request.groupId === request.groupId) {
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
                        request,
                        callId: response.call.id,
                        startedAt: response.call.started_at ?? new Date().toISOString(),
                        ticket: response.ticket,
                    });
                    setStageOpen(true);
                })
                .catch(error => useAlert(parseApiErrorMessage(error) ?? t('CALLS.ROOM.CONNECTION_LOST')))
                .finally(() => setJoining(false));
        },
        [active?.request.groupId],
    );

    const moderate = useCallback(
        (identity: string, request: (accountId: number, groupId: number, userId: number) => Promise<unknown>) => {
            const userId = userIdOfIdentity(identity);
            if (!active || userId === null) return;
            request(active.request.accountId, active.request.groupId, userId).catch(error =>
                useAlert(parseApiErrorMessage(error) ?? t('CALLS.ROOM.CONNECTION_LOST')),
            );
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
            leave: endCall,
            expand: () => setStageOpen(true),
            minimize: () => setStageOpen(false),
            openChat: () => {
                setStageOpen(false);
                if (active) router.visit(active.request.conversationUrl, { preserveState: true });
            },
            muteParticipant: identity => moderate(identity, muteGroupRoomParticipant),
            removeParticipant: identity => moderate(identity, removeGroupRoomParticipant),
        }),
        [active, endCall, moderate, runOnMedia, self?.camOn, self?.isSharingScreen, self?.micOn],
    );

    const room: CallRoomView | null = active
        ? {
              callId: active.callId,
              title: active.request.title,
              conversationUrl: active.request.conversationUrl,
              startedAt: active.startedAt,
              participants: media.participants,
          }
        : null;

    const local: CallLocalState = {
        micOn: self?.micOn ?? false,
        camOn: self?.camOn ?? false,
        sharingScreen: self?.isSharingScreen ?? false,
        deafened,
        canShareScreen: canShareScreen(),
        canModerate: active?.request.canModerate ?? false,
    };

    const session: CallSession = {
        room,
        local,
        stageOpen: Boolean(active) && stageOpen,
        isJoining,
        groupId: active?.request.groupId ?? null,
        sharer: media.participants.find(participant => participant.isSharingScreen) ?? null,
        actions,
        renderMedia: media.renderMedia,
        joinGroupRoom: joinGroup,
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
