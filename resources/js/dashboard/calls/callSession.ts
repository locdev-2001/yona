import { createContext, useContext } from 'react';
import type { CallActions, CallLocalState, CallParticipantView, CallRoomView, RenderCallMedia } from './types';

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
};

export const CallSessionContext = createContext<CallSession>(IDLE_SESSION);

export const useCallSession = (): CallSession => useContext(CallSessionContext);
