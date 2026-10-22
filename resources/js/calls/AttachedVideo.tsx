import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { Track } from 'livekit-client';
import { useCallPreferences } from 'dashboard/calls/preferences';
import type { CallStatistics } from 'dashboard/calls/statistics';
import VideoStatistics from 'dashboard/calls/VideoStatistics';
import { screenBelowRequirement } from 'dashboard/calls/qualityProfile';

// Gắn một track hình của LiveKit vào thẻ video; gỡ khi đổi track hoặc rời màn.
export default function AttachedVideo({
    track,
    fit,
    mirrored = false,
    identity,
    source,
    statistics,
}: {
    track: Track;
    fit: 'cover' | 'contain';
    mirrored?: boolean;
    identity: string;
    source: 'camera' | 'screen';
    statistics: CallStatistics;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const preferences = useCallPreferences();

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return undefined;

        track.attach(video);
        return () => {
            track.detach(video);
        };
    }, [track]);

    return (
        <>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`size-full ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${mirrored ? '-scale-x-100' : ''}`}
            />
            {preferences.showStatistics || source === 'screen' ? (
                <StatisticsOverlay statistics={statistics} identity={identity} source={source} showDetails={preferences.showStatistics} />
            ) : null}
        </>
    );
}

function StatisticsOverlay({
    statistics,
    identity,
    source,
    showDetails,
}: {
    statistics: CallStatistics;
    identity: string;
    source: 'camera' | 'screen';
    showDetails: boolean;
}) {
    const snapshot = useSyncExternalStore(statistics.subscribe, statistics.read);
    const stream = snapshot.streams.find((candidate) => candidate.identity === identity && candidate.source === source);
    if (!showDetails && (!stream || !screenBelowRequirement(stream))) return null;
    return <VideoStatistics statistics={stream} source={source} />;
}
