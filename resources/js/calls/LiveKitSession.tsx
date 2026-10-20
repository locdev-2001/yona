import { useEffect, useState } from 'react';
import { DisconnectReason, Room, RoomEvent, Track } from 'livekit-client';
import type { Participant } from 'livekit-client';
import { RoomAudioRenderer } from '@livekit/components-react';
import type { CallMediaSource, CallParticipantView } from 'dashboard/calls/types';
import AttachedVideo from './AttachedVideo';
import { userIdOfIdentity } from 'dashboard/calls/participantIdentity';
import type { MediaSessionEnd, MediaSessionHandle, MediaSessionProps } from './mediaSession';

// Lớp media duy nhất dùng LiveKit: kết nối phòng bằng vé, dịch người trong phòng sang mô hình
// hiển thị trung tính, phát âm thanh phòng, nhận lệnh bật/tắt nguồn phát từ phiên gọi.

const ROOM_EVENTS = [
    RoomEvent.Connected,
    RoomEvent.ParticipantConnected,
    RoomEvent.ParticipantDisconnected,
    RoomEvent.ParticipantAttributesChanged,
    RoomEvent.TrackPublished,
    RoomEvent.TrackUnpublished,
    RoomEvent.TrackSubscribed,
    RoomEvent.TrackUnsubscribed,
    RoomEvent.TrackMuted,
    RoomEvent.TrackUnmuted,
    RoomEvent.LocalTrackPublished,
    RoomEvent.LocalTrackUnpublished,
    RoomEvent.ActiveSpeakersChanged,
] as const;

const TRACK_SOURCE: Record<CallMediaSource, Track.Source> = {
    camera: Track.Source.Camera,
    screen: Track.Source.ScreenShare,
};

const END_BY_REASON: Partial<Record<DisconnectReason, MediaSessionEnd>> = {
    [DisconnectReason.CLIENT_INITIATED]: 'left',
    [DisconnectReason.PARTICIPANT_REMOVED]: 'removed',
    [DisconnectReason.DUPLICATE_IDENTITY]: 'replaced',
    [DisconnectReason.ROOM_DELETED]: 'closed',
    [DisconnectReason.ROOM_CLOSED]: 'closed',
};

function toView(participant: Participant, isLocal: boolean): CallParticipantView {
    return {
        identity: participant.identity,
        userId: userIdOfIdentity(participant.identity),
        name: participant.name || participant.identity,
        avatarUrl: participant.attributes?.avatar_url || null,
        isLocal,
        micOn: participant.isMicrophoneEnabled,
        camOn: participant.isCameraEnabled,
        isSpeaking: participant.isSpeaking,
        isSharingScreen: participant.isScreenShareEnabled,
    };
}

function participantsOf(room: Room): Participant[] {
    return [room.localParticipant, ...room.remoteParticipants.values()];
}

export default function LiveKitSession({ serverUrl, token, deafened, onState, onReady, onEnded }: MediaSessionProps) {
    const [room] = useState(() => new Room({ adaptiveStream: true, dynacast: true }));

    useEffect(() => {
        const emitState = () => {
            const participants = participantsOf(room);
            onState({
                participants: participants.map(participant => toView(participant, participant === room.localParticipant)),
                renderMedia: (identity, source) => {
                    const participant = participants.find(candidate => candidate.identity === identity);
                    const track = participant?.getTrackPublication(TRACK_SOURCE[source])?.track;
                    if (!track) return null;

                    const isOwnCamera = participant === room.localParticipant && source === 'camera';
                    return <AttachedVideo key={track.sid} track={track} fit={source === 'screen' ? 'contain' : 'cover'} mirrored={isOwnCamera} />;
                },
            });
        };
        // Phiên đã bị gỡ (rời, đổi phòng) thì mọi kết quả kết nối đến muộn không được đụng phiên gọi mới.
        let isCancelled = false;
        const onDisconnected = (reason?: DisconnectReason) => {
            const end = (reason !== undefined && END_BY_REASON[reason]) || 'lost';
            if (end !== 'left') onEnded(end);
        };

        ROOM_EVENTS.forEach(event => room.on(event, emitState));
        room.on(RoomEvent.Disconnected, onDisconnected);

        const handle: MediaSessionHandle = {
            setMicrophone: async enabled => {
                await room.localParticipant.setMicrophoneEnabled(enabled);
                emitState();
            },
            setCamera: async enabled => {
                await room.localParticipant.setCameraEnabled(enabled);
                emitState();
            },
            setScreenShare: async enabled => {
                await room.localParticipant.setScreenShareEnabled(enabled, { audio: true });
                emitState();
            },
            listDevices: async kind => {
                const devices = await Room.getLocalDevices(kind);
                const activeId = room.getActiveDevice(kind);
                return devices.map(device => ({ id: device.deviceId, label: device.label, isActive: device.deviceId === activeId }));
            },
            selectDevice: async (kind, deviceId) => {
                await room.switchActiveDevice(kind, deviceId);
            },
        };

        room.connect(serverUrl, token)
            .then(() => {
                if (isCancelled) return;
                emitState();
                onReady(handle);
            })
            .catch(() => {
                if (!isCancelled) onEnded('lost');
            });

        return () => {
            isCancelled = true;
            ROOM_EVENTS.forEach(event => room.off(event, emitState));
            room.off(RoomEvent.Disconnected, onDisconnected);
            void room.disconnect();
        };
        // Một phiên = một lần kết nối bằng một vé; vé mới thì phiên gọi dựng lại thành phần này.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [room]);

    return <RoomAudioRenderer room={room} muted={deafened} />;
}
