import { createContext, useContext } from 'react';
import type { Conversation } from 'dashboard/conversation/types';
import type { GroupCallPayload } from './api';
import type { CallActions, CallLocalState, CallMediaKind, CallParticipantView, CallRoomView, DirectCallView, RenderCallMedia } from './types';

// Phiên gọi đang diễn ra của người dùng, sống ở gốc app (resources/js/calls/) để chuyển trang
// không rớt phòng. Giao diện chỉ đọc qua hook này, không biết lớp media bên dưới.

export interface JoinGroupRoomRequest {
    accountId: number;
    groupId: number;
    title: string;
    conversationUrl: string;
    // Người xem là quản trị nhóm: được tắt mic / mời người khác ra.
    canModerate: boolean;
}

export interface JoinGroupCallRequest extends JoinGroupRoomRequest {
    media: CallMediaKind;
}

export type ActiveCallKind = 'group_room' | 'group_call' | 'direct';

// Cuộc gọi nhóm đang đổ chuông tới mình.
export interface GroupRingState {
    payload: GroupCallPayload;
    isExpanded: boolean;
}

export interface GroupRingActions {
    accept: (media: CallMediaKind) => void;
    decline: () => void;
    expand: () => void;
    collapse: () => void;
    openChat: () => void;
}

export interface StartDirectCallRequest {
    accountId: number;
    // Hội thoại 1-1 với người cần gọi; máy chủ tìm người đó từ hội thoại.
    conversation: Conversation;
    media: CallMediaKind;
}

// Cuộc gọi 1-1 đang đổ chuông hoặc đang nói, kèm account (hộp thư) của mình để gọi API.
export interface DirectCallState {
    view: DirectCallView;
    accountId: number;
    // Đang mở màn gọi lớn (vuốt lên / bấm tên) thay vì thẻ, dải gọn.
    isExpanded: boolean;
}

export interface DirectCallActions {
    accept: (media: CallMediaKind) => void;
    hangUp: () => void;
    expand: () => void;
    collapse: () => void;
    openChat: () => void;
}

export interface CallSession {
    room: CallRoomView | null;
    local: CallLocalState;
    stageOpen: boolean;
    isJoining: boolean;
    // Nhóm của phòng hay cuộc gọi nhóm đang ở (để mũ khung chat biết mình đã ở trong đó).
    groupId: number | null;
    activeKind: ActiveCallKind | null;
    sharer: CallParticipantView | null;
    actions: CallActions;
    renderMedia: RenderCallMedia;
    joinGroupRoom: (request: JoinGroupRoomRequest) => void;
    joinGroupCall: (request: JoinGroupCallRequest) => void;
    startDirectCall: (request: StartDirectCallRequest) => void;
    // Mở app (hoặc tải lại trang) giữa lúc có người đang gọi tới: hỏi máy chủ để đổ chuông lại.
    recoverRingingCalls: (accountId: number) => void;
    groupRing: GroupRingState | null;
    groupRingActions: GroupRingActions;
    direct: DirectCallState | null;
    directActions: DirectCallActions;
    // Định danh của mình trong phòng đang nối (để đọc âm lượng của mình).
    selfIdentity: string | null;
    readAudioLevel: (identity: string) => number;
}

const noop = () => undefined;

const IDLE_SESSION: CallSession = {
    room: null,
    local: { micOn: false, camOn: false, sharingScreen: false, deafened: false, canUseCamera: false, canShareScreen: false, canModerate: false },
    stageOpen: false,
    isJoining: false,
    groupId: null,
    activeKind: null,
    sharer: null,
    actions: {
        toggleMic: noop,
        toggleCamera: noop,
        toggleScreen: noop,
        toggleDeafen: noop,
        listDevices: async () => [],
        selectDevice: async () => undefined,
        leave: noop,
        expand: noop,
        minimize: noop,
        openChat: noop,
        muteParticipant: noop,
        removeParticipant: noop,
    },
    renderMedia: () => null,
    joinGroupRoom: noop,
    joinGroupCall: noop,
    startDirectCall: noop,
    recoverRingingCalls: noop,
    groupRing: null,
    groupRingActions: { accept: noop, decline: noop, expand: noop, collapse: noop, openChat: noop },
    direct: null,
    directActions: { accept: noop, hangUp: noop, expand: noop, collapse: noop, openChat: noop },
    selfIdentity: null,
    readAudioLevel: () => 0,
};

export const CallSessionContext = createContext<CallSession>(IDLE_SESSION);

export const useCallSession = (): CallSession => useContext(CallSessionContext);

export const isCallStageOpen = (session: CallSession): boolean =>
    Boolean(session.room && session.stageOpen && (session.activeKind !== 'direct' || session.sharer));
