import type { RoomOptions, ScreenShareCaptureOptions, TrackPublishOptions } from 'livekit-client';
import { CALL_QUALITY } from 'dashboard/calls/qualityProfile';

export const SCREEN_REQUIREMENT = CALL_QUALITY.screen;

export const SCREEN_CAPTURE: ScreenShareCaptureOptions = { audio: true, resolution: SCREEN_REQUIREMENT, contentHint: 'motion' };
export const SCREEN_PUBLISH: TrackPublishOptions = {
    videoCodec: 'h264',
    simulcast: false,
    screenShareEncoding: { maxBitrate: SCREEN_REQUIREMENT.maxBitrate, maxFramerate: SCREEN_REQUIREMENT.frameRate, priority: 'high' },
    degradationPreference: 'balanced',
    dtx: false,
};

export const CALL_ROOM_OPTIONS: RoomOptions = {
    adaptiveStream: true,
    dynacast: true,
    webAudioMix: true,
    videoCaptureDefaults: { resolution: CALL_QUALITY.camera },
    audioCaptureDefaults: { echoCancellation: true, autoGainControl: true, noiseSuppression: true, channelCount: 1, sampleRate: 48000 },
    publishDefaults: {
        videoCodec: 'h264',
        videoEncoding: { maxBitrate: CALL_QUALITY.camera.maxBitrate, maxFramerate: CALL_QUALITY.camera.frameRate },
        audioPreset: { maxBitrate: 48_000 },
        dtx: true,
        red: true,
        forceStereo: false,
    },
};

export async function selectCallVideoCodec(): Promise<'h264' | 'vp8'> {
    const supported = typeof RTCRtpSender === 'undefined' ? [] : (RTCRtpSender.getCapabilities?.('video')?.codecs ?? []);
    const candidates = (['h264', 'vp8'] as const).filter((codec) =>
        supported.some((candidate) => candidate.mimeType.toLowerCase() === `video/${codec}`),
    );
    const fallback = candidates[0] ?? 'vp8';
    if (!navigator.mediaCapabilities?.encodingInfo) return fallback;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const inspect = async (codec: 'h264' | 'vp8') => {
        const video = {
            contentType: `video/${codec === 'h264' ? 'H264' : 'VP8'}`,
            width: SCREEN_REQUIREMENT.width,
            height: SCREEN_REQUIREMENT.height,
            bitrate: SCREEN_REQUIREMENT.maxBitrate,
            framerate: SCREEN_REQUIREMENT.frameRate,
        };
        try {
            const [encode, decode] = await Promise.all([
                navigator.mediaCapabilities.encodingInfo({ type: 'webrtc', video }),
                navigator.mediaCapabilities.decodingInfo({ type: 'webrtc', video }),
            ]);
            return encode.supported && encode.powerEfficient && decode.supported && decode.powerEfficient ? codec : null;
        } catch {
            return null;
        }
    };
    try {
        const efficient = await Promise.race([
            Promise.all(candidates.map(inspect)),
            new Promise<null[]>((resolve) => {
                timer = setTimeout(() => resolve([]), 750);
            }),
        ]);
        return efficient.find((codec) => codec !== null) ?? fallback;
    } finally {
        clearTimeout(timer);
    }
}
