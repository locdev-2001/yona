import type { ReactNode } from 'react';
import type { AvatarStackPerson } from 'shared/avatar/AvatarStack';

// Mô hình hiển thị của một cuộc gọi, không phụ thuộc nhà cung cấp media: lớp bọc ở
// resources/js/calls/ dịch phòng media sang các kiểu này, giao diện chỉ đọc chúng.

export type CallMediaSource = 'camera' | 'screen';

export interface CallParticipantView {
    identity: string;
    userId: number | null;
    name: string;
    avatarUrl: string | null;
    isLocal: boolean;
    micOn: boolean;
    camOn: boolean;
    isSpeaking: boolean;
    isSharingScreen: boolean;
}

export interface CallRoomView {
    callId: number;
    title: string;
    // Hội thoại chủ của phòng: nút "Chat của nhóm" mở về đây.
    conversationUrl: string;
    startedAt: string;
    participants: CallParticipantView[];
}

export interface CallLocalState {
    micOn: boolean;
    camOn: boolean;
    sharingScreen: boolean;
    // Tắt toàn bộ âm thanh phòng phía mình (không nghe ai, người khác vẫn nghe mình nếu mở mic).
    deafened: boolean;
    // Trình duyệt có getDisplayMedia (điện thoại không có).
    canShareScreen: boolean;
    // Người xem được tắt mic / mời người khác ra.
    canModerate: boolean;
}

export interface CallActions {
    toggleMic: () => void;
    toggleCamera: () => void;
    toggleScreen: () => void;
    toggleDeafen: () => void;
    listDevices: (kind: CallDeviceKind) => Promise<CallDevice[]>;
    selectDevice: (kind: CallDeviceKind, deviceId: string) => void;
    leave: () => void;
    expand: () => void;
    minimize: () => void;
    openChat: () => void;
    muteParticipant: (identity: string) => void;
    removeParticipant: (identity: string) => void;
}

export type CallDeviceKind = 'audioinput' | 'videoinput';

export interface CallDevice {
    id: string;
    label: string;
    isActive: boolean;
}

// Lớp media vẽ hình của một nguồn phát; không có thì ô hiện ảnh đại diện.
export type RenderCallMedia = (identity: string, source: CallMediaSource) => ReactNode;

export interface OpenRoomPerson extends AvatarStackPerson {
    is_sharing_screen: boolean;
}

// Phòng đang mở nhìn từ danh sách hội thoại / mũ khung chat (payload server, cùng hình avatar_members).
export interface OpenRoomSummary {
    call_id: number;
    started_at: string;
    participants: OpenRoomPerson[];
    total: number;
}
