import type { CallDevice, CallDeviceKind, CallParticipantView, RenderCallMedia } from 'dashboard/calls/types';

// Hợp đồng giữa phiên gọi ở gốc app (CallSessionProvider) và lớp media được tải lười
// (LiveKitSession): lớp media báo trạng thái phòng lên, phiên gọi điều khiển qua handle.

export interface MediaSessionState {
    participants: CallParticipantView[];
    renderMedia: RenderCallMedia;
}

export interface MediaSessionHandle {
    setMicrophone: (enabled: boolean) => Promise<void>;
    setCamera: (enabled: boolean) => Promise<void>;
    setScreenShare: (enabled: boolean) => Promise<void>;
    listDevices: (kind: CallDeviceKind) => Promise<CallDevice[]>;
    selectDevice: (kind: CallDeviceKind, deviceId: string) => Promise<void>;
}

// Vì sao phòng đóng phía mình: tự rời, bị mời ra, vào lại ở nơi khác, phòng bị đóng, mất kết nối.
export type MediaSessionEnd = 'left' | 'removed' | 'replaced' | 'closed' | 'lost';

export interface MediaSessionProps {
    serverUrl: string;
    token: string;
    deafened: boolean;
    onState: (state: MediaSessionState) => void;
    onReady: (handle: MediaSessionHandle) => void;
    onEnded: (reason: MediaSessionEnd) => void;
}
