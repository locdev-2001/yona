import { useEffect, useRef, useState } from 'react';
import {
    DisconnectReason,
    LocalAudioTrack,
    RemoteTrackPublication,
    Room,
    RoomEvent,
    Track,
    VideoQuality,
    supportsAudioOutputSelection,
} from 'livekit-client';
import type { Participant } from 'livekit-client';
import { AudioTrack, useTracks } from '@livekit/components-react';
import type { CallMediaSource, CallParticipantView } from 'dashboard/calls/types';
import { readCallPreferences, subscribeCallPreferences, useCallPreferences } from 'dashboard/calls/preferences';
import { userIdOfIdentity } from 'dashboard/calls/participantIdentity';
import AttachedVideo from './AttachedVideo';
import { LiveKitStatistics } from './LiveKitStatistics';
import { CallTelemetry } from './CallTelemetry';
import { CALL_ROOM_OPTIONS, SCREEN_CAPTURE, SCREEN_PUBLISH, SCREEN_REQUIREMENT, selectCallVideoCodec } from './livekitProfiles';
import type { MediaSessionEnd, MediaSessionHandle, MediaSessionProps } from './mediaSession';
import { MediaOperationError, mediaFailureReason } from './mediaSession';

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
const TRACK_SOURCE: Record<CallMediaSource, Track.Source> = { camera: Track.Source.Camera, screen: Track.Source.ScreenShare };
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

async function restartMicrophone(track: LocalAudioTrack, noiseSuppression: boolean): Promise<void> {
    await track.restartTrack({
        ...track.constraints,
        deviceId: track.constraints.deviceId ?? track.mediaStreamTrack.getSettings().deviceId ?? 'default',
        echoCancellation: true,
        autoGainControl: true,
        noiseSuppression,
        channelCount: 1,
        sampleRate: 48000,
    });
}

export default function LiveKitSession({ callId, serverUrl, token, deafened, onState, onReady, onEnded }: MediaSessionProps) {
    const [room] = useState(() => new Room(CALL_ROOM_OPTIONS));
    const telemetryRef = useRef<CallTelemetry | null>(null);
    const firstPlayback = useRef(false);

    useEffect(() => {
        let isCancelled = false;
        let lastSignature = '';
        let filterState: 'off' | 'browser' | 'enhanced' = 'browser';
        let filterEnabled: boolean | undefined;
        let filteredTrack: LocalAudioTrack | undefined;
        let filterOperation = Promise.resolve();
        const reader = new LiveKitStatistics(room);
        const telemetry = new CallTelemetry(callId, reader.statistics);
        telemetryRef.current = telemetry;
        const videoCodec = selectCallVideoCodec();
        const canSelectAudioOutput = supportsAudioOutputSelection() && typeof AudioContext !== 'undefined' && 'setSinkId' in AudioContext.prototype;
        const renderMedia = (identity: string, source: CallMediaSource) => {
            const participant = room.getParticipantByIdentity(identity);
            const track = participant?.getTrackPublication(TRACK_SOURCE[source])?.track;
            if (!track) return null;
            return (
                <AttachedVideo
                    key={track.sid}
                    track={track}
                    identity={identity}
                    source={source}
                    statistics={reader.statistics}
                    fit={source === 'screen' ? 'contain' : 'cover'}
                    mirrored={participant === room.localParticipant && source === 'camera'}
                />
            );
        };
        const readAudioLevel = (identity: string) => room.getParticipantByIdentity(identity)?.audioLevel ?? 0;
        const emitState = () => {
            if (isCancelled) return;
            const participants = participantsOf(room).map((participant) => toView(participant, participant === room.localParticipant));
            const signature = JSON.stringify([participants, filterState, canSelectAudioOutput]);
            if (signature === lastSignature) return;
            lastSignature = signature;
            onState({ participants, renderMedia, readAudioLevel, canSelectAudioOutput, filterState });
        };
        const applyVolumes = () => {
            const preferences = readCallPreferences();
            room.remoteParticipants.forEach((participant) => {
                const volume = preferences.outputVolume * (preferences.participantVolumes[participant.identity] ?? 1);
                participant.setVolume(volume, Track.Source.Microphone);
                participant.setVolume(preferences.outputVolume, Track.Source.ScreenShareAudio);
            });
        };
        const configureFilter = async () => {
            const track = room.localParticipant.getTrackPublication(Track.Source.Microphone)?.track;
            const enabled = readCallPreferences().noiseSuppression;
            if (!(track instanceof LocalAudioTrack) || track.isMuted || (filterEnabled === enabled && filteredTrack === track) || isCancelled) return;
            filterEnabled = enabled;
            filteredTrack = track;
            await track.stopProcessor();
            if (isCancelled) return;
            if (!enabled) {
                await restartMicrophone(track, false);
                filterState = 'off';
            } else {
                try {
                    const { RnnoiseProcessor } = await import('./RnnoiseProcessor');
                    if (isCancelled) return;
                    await restartMicrophone(track, false);
                    if (isCancelled) return;
                    const processor = new RnnoiseProcessor(() => {
                        filterOperation = filterOperation
                            .then(async () => {
                                if (isCancelled) return;
                                const stillEnabled = readCallPreferences().noiseSuppression;
                                await track.stopProcessor();
                                if (isCancelled) return;
                                await restartMicrophone(track, stillEnabled);
                                filterEnabled = stillEnabled;
                                filterState = stillEnabled ? 'browser' : 'off';
                                telemetry.event('noise_filter_fallback');
                                emitState();
                            })
                            .catch(() => {
                                telemetry.event('noise_filter_error');
                            });
                    });
                    try {
                        await track.setProcessor(processor);
                    } catch (error) {
                        await processor.destroy();
                        throw error;
                    }
                    if (isCancelled) {
                        await track.stopProcessor();
                        return;
                    }
                    filterState = 'enhanced';
                } catch {
                    if (isCancelled) return;
                    await track.stopProcessor();
                    if (isCancelled) return;
                    await restartMicrophone(track, true);
                    filterState = 'browser';
                    telemetry.event('noise_filter_fallback');
                }
            }
            telemetry.event('noise_filter_changed', { enabled, mode: filterState });
            emitState();
        };
        const queueFilter = () => {
            filterOperation = filterOperation.then(configureFilter).catch(() => {
                filterEnabled = undefined;
                telemetry.event('noise_filter_error');
            });
            return filterOperation;
        };
        let startingScreen = false;
        let screenGeneration = 0;
        let stoppingScreen: Promise<void> | null = null;
        const stopScreens = (): Promise<void> => {
            if (stoppingScreen) return stoppingScreen;
            const tracks = [Track.Source.ScreenShare, Track.Source.ScreenShareAudio].flatMap((source) => {
                const track = room.localParticipant.getTrackPublication(source)?.track;
                return track ? [track] : [];
            });
            stoppingScreen = Promise.all(
                tracks.map(async (track) => {
                    try {
                        await room.localParticipant.unpublishTrack(track);
                    } finally {
                        track.stop();
                    }
                }),
            )
                .then(() => undefined)
                .finally(() => {
                    stoppingScreen = null;
                });
            return stoppingScreen;
        };
        const setScreenSharing = async (enabled: boolean): Promise<void> => {
            if (enabled && (startingScreen || room.localParticipant.isScreenShareEnabled)) return;
            const operationGeneration = ++screenGeneration;
            try {
                if (!enabled) {
                    await stopScreens();
                } else {
                    startingScreen = true;
                    const tracks = await room.localParticipant.createScreenTracks(SCREEN_CAPTURE);
                    const screen = tracks.find((track) => track.source === Track.Source.ScreenShare);
                    try {
                        const { width, height, frameRate } = SCREEN_REQUIREMENT;
                        await screen?.mediaStreamTrack.applyConstraints({
                            width: { min: width, ideal: width },
                            height: { min: height, ideal: height },
                            frameRate: { min: frameRate, ideal: frameRate, max: frameRate },
                        });
                        const settings = screen?.mediaStreamTrack.getSettings();
                        if (!settings || (settings.width ?? 0) < width || (settings.height ?? 0) < height || (settings.frameRate ?? 0) < frameRate)
                            throw new MediaOperationError('screen_quality');
                    } catch {
                        tracks.forEach((track) => track.stop());
                        throw new MediaOperationError('screen_quality');
                    }
                    if (isCancelled || operationGeneration !== screenGeneration) {
                        tracks.forEach((track) => track.stop());
                        return;
                    }
                    try {
                        const codec = await videoCodec;
                        if (isCancelled || operationGeneration !== screenGeneration) {
                            tracks.forEach((track) => track.stop());
                            return;
                        }
                        await Promise.all(
                            tracks.map((track) =>
                                room.localParticipant.publishTrack(
                                    track,
                                    track.kind === Track.Kind.Audio
                                        ? { audioPreset: { maxBitrate: 128_000 }, forceStereo: true, red: false, dtx: false }
                                        : { ...SCREEN_PUBLISH, videoCodec: codec },
                                ),
                            ),
                        );
                        if (isCancelled || operationGeneration !== screenGeneration) {
                            await Promise.allSettled(
                                tracks.map(async (track) => {
                                    try {
                                        await room.localParticipant.unpublishTrack(track);
                                    } finally {
                                        track.stop();
                                    }
                                }),
                            );
                            return;
                        }
                        screen?.mediaStreamTrack.addEventListener(
                            'ended',
                            () => {
                                if (!isCancelled) void setScreenSharing(false).catch(() => undefined);
                            },
                            { once: true },
                        );
                    } catch (error) {
                        await Promise.allSettled(
                            tracks.map(async (track) => {
                                try {
                                    await room.localParticipant.unpublishTrack(track);
                                } finally {
                                    track.stop();
                                }
                            }),
                        );
                        throw error;
                    }
                }
                if (isCancelled) return;
                telemetry.event('screen_changed', { enabled });
                emitState();
            } catch (error) {
                telemetry.event('media_error', { kind: 'screen', error_code: mediaFailureReason(error) });
                throw error;
            } finally {
                if (enabled) startingScreen = false;
            }
        };
        const applyPreferences = () => {
            applyVolumes();
            void queueFilter();
        };
        const configureScreens = () => {
            room.remoteParticipants.forEach((participant) =>
                participant.videoTrackPublications.forEach((publication) => {
                    if (publication.source !== Track.Source.ScreenShare || !(publication instanceof RemoteTrackPublication)) return;
                    publication.setVideoQuality(VideoQuality.HIGH);
                    publication.setVideoFPS(SCREEN_REQUIREMENT.frameRate);
                }),
            );
            applyVolumes();
        };
        const onDisconnected = (reason?: DisconnectReason) => {
            telemetry.event('disconnected', { reason: reason ?? null });
            const end = (reason !== undefined && END_BY_REASON[reason]) || 'lost';
            if (end !== 'left' && !isCancelled) onEnded(end);
        };
        const onReconnecting = () => telemetry.event('reconnecting');
        const onReconnected = () => {
            telemetry.event('reconnected');
            applyPreferences();
        };
        ROOM_EVENTS.forEach((event) => room.on(event, emitState));
        room.on(RoomEvent.TrackSubscribed, configureScreens);
        room.on(RoomEvent.Disconnected, onDisconnected);
        room.on(RoomEvent.Reconnecting, onReconnecting);
        room.on(RoomEvent.Reconnected, onReconnected);
        const unsubscribePreferences = subscribeCallPreferences(applyPreferences);
        telemetry.start();
        const handle: MediaSessionHandle = {
            setMicrophone: async (enabled) => {
                try {
                    if (isCancelled) return;
                    const publication = await room.localParticipant.setMicrophoneEnabled(enabled);
                    if (isCancelled) {
                        publication?.track?.stop();
                        return;
                    }
                    if (enabled) await queueFilter();
                    telemetry.event('microphone_changed', { enabled });
                    emitState();
                } catch (error) {
                    telemetry.event('media_error', { kind: 'microphone', error_code: mediaFailureReason(error) });
                    throw error;
                }
            },
            setCamera: async (enabled) => {
                try {
                    const codec = await videoCodec;
                    if (isCancelled) return;
                    const publication = await room.localParticipant.setCameraEnabled(enabled, undefined, { videoCodec: codec });
                    if (isCancelled) {
                        publication?.track?.stop();
                        return;
                    }
                    telemetry.event('camera_changed', { enabled });
                    emitState();
                } catch (error) {
                    telemetry.event('media_error', { kind: 'camera', error_code: mediaFailureReason(error) });
                    throw error;
                }
            },
            setScreenShare: setScreenSharing,
            listDevices: async (kind) => {
                if (kind === 'audiooutput' && !canSelectAudioOutput) return [];
                const devices = await Room.getLocalDevices(kind);
                const activeId = room.getActiveDevice(kind);
                return devices.map((device) => ({ id: device.deviceId, label: device.label, isActive: device.deviceId === activeId }));
            },
            selectDevice: async (kind, deviceId) => {
                await room.switchActiveDevice(kind, deviceId);
                if (kind === 'audioinput') {
                    filterEnabled = undefined;
                    await queueFilter();
                }
                telemetry.event('device_changed', { kind });
            },
        };
        room.connect(serverUrl, token)
            .then(() => {
                if (isCancelled) return;
                telemetry.event('connected');
                reader.start();
                emitState();
                onReady(handle);
                void room.startAudio().catch(() => telemetry.event('audio_playback_blocked'));
            })
            .catch((error: unknown) => {
                if (isCancelled) return;
                const reason = error && typeof error === 'object' && 'reason' in error && typeof error.reason === 'number' ? error.reason : null;
                telemetry.event('connection_failed', { reason, error_code: mediaFailureReason(error) });
                onEnded(/max participants/i.test(error instanceof Error ? error.message : String(error)) ? 'full' : 'lost');
            });
        return () => {
            isCancelled = true;
            telemetryRef.current = null;
            reader.stop();
            telemetry.stop();
            unsubscribePreferences();
            ROOM_EVENTS.forEach((event) => room.off(event, emitState));
            room.off(RoomEvent.TrackSubscribed, configureScreens);
            room.off(RoomEvent.Disconnected, onDisconnected);
            room.off(RoomEvent.Reconnecting, onReconnecting);
            room.off(RoomEvent.Reconnected, onReconnected);
            void room.disconnect();
        };
        // Vé mới dựng một phiên mới; callback và trạng thái của phiên không đổi vòng kết nối.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [room]);

    return (
        <CallAudio
            room={room}
            muted={deafened}
            onPlaying={() => {
                if (firstPlayback.current || !telemetryRef.current) return;
                firstPlayback.current = true;
                telemetryRef.current.event('first_audio_played');
            }}
        />
    );
}

function CallAudio({ room, muted, onPlaying }: { room: Room; muted: boolean; onPlaying: () => void }) {
    const preferences = useCallPreferences();
    const tracks = useTracks([Track.Source.Microphone, Track.Source.ScreenShareAudio, Track.Source.Unknown], { room, onlySubscribed: true });
    return (
        <div className="hidden">
            {tracks
                .filter((reference) => !reference.participant.isLocal && reference.publication.kind === Track.Kind.Audio)
                .map((reference) => (
                    <AudioTrack
                        key={reference.publication.trackSid}
                        trackRef={reference}
                        muted={muted}
                        onPlaying={onPlaying}
                        volume={
                            preferences.outputVolume *
                            (reference.source === Track.Source.Microphone ? (preferences.participantVolumes[reference.participant.identity] ?? 1) : 1)
                        }
                    />
                ))}
        </div>
    );
}
