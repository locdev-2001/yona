import { useEffect, useRef } from 'react';
import type { Track } from 'livekit-client';

// Gắn một track hình của LiveKit vào thẻ video; gỡ khi đổi track hoặc rời màn.
export default function AttachedVideo({ track, fit, mirrored = false }: { track: Track; fit: 'cover' | 'contain'; mirrored?: boolean }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return undefined;

        track.attach(video);
        return () => {
            track.detach(video);
        };
    }, [track]);

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`size-full ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${mirrored ? '-scale-x-100' : ''}`}
        />
    );
}
