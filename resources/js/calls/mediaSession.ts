import type { CallDevice, CallDeviceKind, CallParticipantView, RenderCallMedia } from 'dashboard/calls/types';

// Hợp đồng giữa phiên gọi ở gốc app (CallSessionProvider) và lớp media được tải lười
// (LiveKitSession): lớp media báo trạng thái phòng lên, phiên gọi điều khiển qua handle.

export interface MediaSessionState {
    participants: CallParticipantView[];
    renderMedia: RenderCallMedia;
    // Âm lượng 0..1 của một người lúc gọi (đọc mỗi khung hình cho hiệu ứng, không qua state React).
    readAudioLevel: (identity: string) => number;
}

export interface MediaSessionHandle {
    setMicrophone: (enabled: boolean) => Promise<void>;
    setCamera: (enabled: boolean) => Promise<void>;
    setScreenShare: (enabled: boolean) => Promise<void>;
    listDevices: (kind: CallDeviceKind) => Promise<CallDevice[]>;
    selectDevice: (kind: CallDeviceKind, deviceId: string) => Promise<void>;
}

// Vì sao phòng đóng phía mình: tự rời, bị đưa ra, vào lại ở nơi khác, phòng bị đóng, phòng đầy,
// mất kết nối.
export type MediaSessionEnd = 'left' | 'removed' | 'replaced' | 'closed' | 'full' | 'lost';

export interface MediaSessionProps {
    serverUrl: string;
    token: string;
    deafened: boolean;
    onState: (state: MediaSessionState) => void;
    onReady: (handle: MediaSessionHandle) => void;
    onEnded: (reason: MediaSessionEnd) => void;
}
