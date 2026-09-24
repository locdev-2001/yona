import { useEffect, useId, useRef, useState } from 'react';
import { downloadFile } from '@ext/utils';

import Icon from 'dashboard/components-next/icon/Icon';
import { emitter } from 'shared/helpers/emitter';

import type { MessageAttachment } from '../helpers/attachments';

// Port từ dashboard/components-next/message/chips/Audio.vue. Bỏ khối
// transcribedText (bản ghi lời thoại — Captain/EE, payload đính kèm chưa có).
const PLAYBACK_SPEEDS = [1, 1.5, 2];
const PAUSE_PLAYING_AUDIO = 'pause_playing_audio';

// timeStampAppendedURL của helper/URLHelper.js — chống cache khi phát lại.
function timeStampAppendedURL(dataUrl: string): string {
    try {
        const url = new URL(dataUrl, window.location.origin);
        if (!url.searchParams.has('t')) {
            url.searchParams.append('t', String(Date.now()));
        }
        return url.toString();
    } catch {
        return dataUrl;
    }
}

function formatTime(time: number): string {
    if (!time || Number.isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function AudioChip({ attachment, className = '' }: { attachment: MessageAttachment; className?: string }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const instanceId = useId();

    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    // Blob WebM/Opus của MediaRecorder không có header Duration → tua quá cuối để
    // buộc engine quét file rồi trả về độ dài thật (no-op với mp3/m4a).
    const resolveStreamingDuration = () => {
        const element = audioRef.current;
        if (!element) return;

        const onTimeUpdate = () => {
            element.removeEventListener('timeupdate', onTimeUpdate);
            element.currentTime = 0;
            setDuration(element.duration);
        };
        element.addEventListener('timeupdate', onTimeUpdate);
        try {
            element.currentTime = Number.MAX_SAFE_INTEGER;
        } catch {
            element.removeEventListener('timeupdate', onTimeUpdate);
        }
    };

    const onLoadedMetadata = () => {
        const value = audioRef.current?.duration;
        if (!Number.isFinite(value)) {
            resolveStreamingDuration();
            return;
        }
        setDuration(value!);
    };

    useEffect(() => {
        const element = audioRef.current;
        if (!element) return undefined;

        if (Number.isFinite(element.duration)) setDuration(element.duration);
        element.playbackRate = playbackSpeed;

        const onPauseOthers = (payload: unknown) => {
            if (payload === instanceId) return;
            if (!element.paused) {
                element.pause();
                setIsPlaying(false);
            }
        };
        emitter.on(PAUSE_PLAYING_AUDIO, onPauseOthers);
        return () => emitter.off(PAUSE_PLAYING_AUDIO, onPauseOthers);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [instanceId]);

    const playOrPause = () => {
        const element = audioRef.current;
        if (!element) return;

        if (isPlaying) {
            element.pause();
            setIsPlaying(false);
            return;
        }
        emitter.emit(PAUSE_PLAYING_AUDIO, instanceId);
        void element.play();
        setIsPlaying(true);
    };

    const changePlaybackSpeed = () => {
        const nextSpeed = PLAYBACK_SPEEDS[(PLAYBACK_SPEEDS.indexOf(playbackSpeed) + 1) % PLAYBACK_SPEEDS.length];
        setPlaybackSpeed(nextSpeed);
        if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
    };

    const toggleMute = () => {
        const element = audioRef.current;
        if (!element) return;
        element.muted = !element.muted;
        setIsMuted(element.muted);
    };

    const onEnd = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        setPlaybackSpeed(1);
        if (audioRef.current) audioRef.current.playbackRate = 1;
    };

    return (
        <>
            <audio
                ref={audioRef}
                controls
                className="hidden"
                playsInline
                onLoadedMetadata={onLoadedMetadata}
                onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
                onEnded={onEnd}
            >
                <source src={timeStampAppendedURL(attachment.data_url ?? '')} />
            </audio>
            <div
                className={`rounded-xl w-full gap-2 p-1.5 bg-n-alpha-white flex flex-col items-center border border-n-container shadow-[0px_2px_8px_0px_rgba(94,94,94,0.06)] ${className}`}
            >
                <div className="flex gap-1 w-full flex-1 items-center justify-start">
                    <button className="p-0 border-0 size-8" onClick={playOrPause}>
                        <Icon
                            className="size-8"
                            icon={isPlaying ? 'i-teenyicons-pause-small-solid' : 'i-teenyicons-play-small-solid'}
                        />
                    </button>
                    <div className="tabular-nums text-xs">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                    <div className="flex-1 items-center flex px-2">
                        <input
                            type="range"
                            min="0"
                            max={duration}
                            value={currentTime}
                            className="w-full h-1 bg-n-slate-12/40 rounded-lg appearance-none cursor-pointer accent-current"
                            onChange={(event) => {
                                const time = Number(event.target.value);
                                if (audioRef.current) audioRef.current.currentTime = time;
                                setCurrentTime(time);
                            }}
                        />
                    </div>
                    <button
                        className="border-0 w-10 h-6 grid place-content-center bg-n-alpha-2 hover:bg-alpha-3 rounded-2xl"
                        onClick={changePlaybackSpeed}
                    >
                        <span className="text-xs text-n-slate-11 font-medium">{`${playbackSpeed}x`}</span>
                    </button>
                    <button className="p-0 border-0 size-8 grid place-content-center" onClick={toggleMute}>
                        <Icon className="size-4" icon={isMuted ? 'i-lucide-volume-off' : 'i-lucide-volume-2'} />
                    </button>
                    <button
                        className="p-0 border-0 size-8 grid place-content-center"
                        onClick={() =>
                            downloadFile({
                                url: attachment.data_url ?? '',
                                type: attachment.file_type,
                                extension: attachment.extension ?? null,
                            })
                        }
                    >
                        <Icon className="size-4" icon="i-lucide-download" />
                    </button>
                </div>
            </div>
        </>
    );
}
