import { createContext, useContext } from 'react';
import type { Conversation } from 'dashboard/conversation/types';
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
    // Nhóm đang ngồi trong phòng (để mũ khung chat biết mình đã ở trong phòng đó).
    groupId: number | null;
    sharer: CallParticipantView | null;
    actions: CallActions;
    renderMedia: RenderCallMedia;
    joinGroupRoom: (request: JoinGroupRoomRequest) => void;
    startDirectCall: (request: StartDirectCallRequest) => void;
    // Mở app (hoặc tải lại trang) giữa lúc có người đang gọi tới: hỏi máy chủ để đổ chuông lại.
    recoverDirectCall: (accountId: number) => void;
    direct: DirectCallState | null;
    directActions: DirectCallActions;
    // Định danh của mình trong phòng đang nối (để đọc âm lượng của mình).
    selfIdentity: string | null;
    readAudioLevel: (identity: string) => number;
}

const noop = () => undefined;

const IDLE_SESSION: CallSession = {
    room: null,
    local: { micOn: false, camOn: false, sharingScreen: false, deafened: false, canShareScreen: false, canModerate: false },
    stageOpen: false,
    isJoining: false,
    groupId: null,
    sharer: null,
    actions: {
        toggleMic: noop,
        toggleCamera: noop,
        toggleScreen: noop,
        toggleDeafen: noop,
        listDevices: async () => [],
        selectDevice: noop,
        leave: noop,
        expand: noop,
        minimize: noop,
        openChat: noop,
        muteParticipant: noop,
        removeParticipant: noop,
    },
    renderMedia: () => null,
    joinGroupRoom: noop,
    startDirectCall: noop,
    recoverDirectCall: noop,
    direct: null,
    directActions: { accept: noop, hangUp: noop, expand: noop, collapse: noop, openChat: noop },
    selfIdentity: null,
    readAudioLevel: () => 0,
};

export const CallSessionContext = createContext<CallSession>(IDLE_SESSION);

export const useCallSession = (): CallSession => useContext(CallSessionContext);

// Màn phòng thoại nhóm đang phủ vùng làm việc (không tính màn gọi 1-1, vốn có lớp riêng).
export const isGroupStageOpen = (session: CallSession): boolean => Boolean(session.room && session.stageOpen && !session.direct);
