import { LocalTrack, RemoteTrack, RemoteTrackPublication, Track } from 'livekit-client';
import type { Room, Participant, TrackPublication } from 'livekit-client';
import { CallStatistics } from 'dashboard/calls/statistics';
import type { StatisticsSource, StreamStatistics } from 'dashboard/calls/statistics';
import { readCallPreferences } from 'dashboard/calls/preferences';

type Stat = Record<string, unknown>;
const numeric = (record: Stat | undefined, key: string): number | null =>
    typeof record?.[key] === 'number' && Number.isFinite(record[key]) ? (record[key] as number) : null;
const literal = (record: Stat | undefined, key: string): string | null =>
    typeof record?.[key] === 'string' ? String(record[key]).slice(0, 100) : null;
const SOURCES: Partial<Record<Track.Source, StatisticsSource>> = {
    [Track.Source.Camera]: 'camera',
    [Track.Source.ScreenShare]: 'screen',
    [Track.Source.Microphone]: 'microphone',
    [Track.Source.ScreenShareAudio]: 'screen_audio',
};

export class LiveKitStatistics {
    readonly statistics = new CallStatistics();
    private previous = new Map<string, Stat>();
    private audioReadings = new Map<string, { at: number; statistics: StreamStatistics }>();
    private timer?: ReturnType<typeof setTimeout>;
    private stopped = true;
    private observer?: PerformanceObserver;
    private longTasks = 0;
    private longTaskMs = 0;

    constructor(private room: Room) {}

    start() {
        this.stopped = false;
        if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes.includes('longtask')) {
            this.observer = new PerformanceObserver((list) =>
                list.getEntries().forEach((entry) => {
                    this.longTasks++;
                    this.longTaskMs += entry.duration;
                }),
            );
            this.observer.observe({ type: 'longtask' });
        }
        void this.sample();
    }

    stop() {
        this.stopped = true;
        clearTimeout(this.timer);
        this.observer?.disconnect();
        this.previous.clear();
        this.audioReadings.clear();
    }

    private async sample() {
        const participants: Participant[] = [this.room.localParticipant, ...this.room.remoteParticipants.values()];
        const entries = participants.flatMap((participant) =>
            [...participant.trackPublications.values()].map((publication) => ({ participant, publication })),
        );
        const readings = await Promise.allSettled(entries.map(({ participant, publication }) => this.readTrack(participant, publication)));
        if (this.stopped) return;
        const streams = readings.flatMap((result) => (result.status === 'fulfilled' && result.value ? [result.value] : []));
        const activeKeys = new Set(streams.map((stream) => stream.key));
        for (const key of this.previous.keys()) if (!activeKeys.has(key.split('|')[0])) this.previous.delete(key);
        for (const key of this.audioReadings.keys()) if (!activeKeys.has(key)) this.audioReadings.delete(key);
        this.statistics.publish({ observedAt: new Date().toISOString(), streams, longTasks: this.longTasks, longTaskMs: this.longTaskMs });
        this.timer = setTimeout(
            () => {
                void this.sample();
            },
            readCallPreferences().showStatistics ? 1000 : 5000,
        );
    }

    private async readTrack(participant: Participant, publication: TrackPublication): Promise<StreamStatistics | null> {
        const track = publication.track;
        const source = SOURCES[publication.source];
        if (!track || !source || track.isMuted) return null;
        const key = `${participant.identity}:${publication.trackSid}`;
        const audioReading = this.audioReadings.get(key);
        if (track.kind === Track.Kind.Audio && audioReading && performance.now() - audioReading.at < 5000) return audioReading.statistics;
        if (publication instanceof RemoteTrackPublication && track.kind === Track.Kind.Video && !publication.isEnabled) return null;
        const outgoing = track instanceof LocalTrack;
        const report = outgoing ? await track.sender?.getStats() : track instanceof RemoteTrack ? await track.getRTCStatsReport() : undefined;
        if (!report || this.stopped) return null;
        const records: Stat[] = [];
        report.forEach((record) => records.push(record as Stat));
        const rtp = records.filter((record) => record.type === (outgoing ? 'outbound-rtp' : 'inbound-rtp') && record.isRemote !== true);
        if (!rtp.length) return null;
        const primary = [...rtp].sort((first, second) => (numeric(second, 'frameWidth') ?? 0) - (numeric(first, 'frameWidth') ?? 0))[0];
        let bitrate = 0;
        let hasRate = false;
        let fps: number | null = null;
        let processingMs: number | null = null;
        const bytesField = outgoing ? 'bytesSent' : 'bytesReceived';
        const framesField = outgoing ? 'framesEncoded' : 'framesDecoded';
        for (const record of rtp) {
            const counterKey = `${key}|${record.id}`;
            const previous = this.previous.get(counterKey);
            const interval = (numeric(record, 'timestamp') ?? 0) - (numeric(previous, 'timestamp') ?? 0);
            const delta = (field: string) => {
                const current = numeric(record, field);
                const last = numeric(previous, field);
                return current !== null && last !== null && current >= last && interval > 0 ? current - last : null;
            };
            const bytes = delta(bytesField);
            if (bytes !== null) {
                bitrate += (bytes * 8000) / interval;
                hasRate = true;
            }
            if (record === primary) {
                const frames = delta(framesField);
                fps = frames !== null ? (frames * 1000) / interval : numeric(record, 'framesPerSecond');
                const processing = delta(outgoing ? 'totalEncodeTime' : 'totalDecodeTime');
                processingMs = processing !== null && frames !== null && frames > 0 ? (processing * 1000) / frames : null;
            }
            this.previous.set(counterKey, record);
        }
        const codec = records.find((record) => record.id === primary.codecId);
        const transport = records.find((record) => record.type === 'transport' && record.selectedCandidatePairId);
        const pair =
            records.find((record) => record.id === transport?.selectedCandidatePairId) ??
            records.find((record) => record.type === 'candidate-pair' && record.nominated === true && record.state === 'succeeded');
        const candidate = records.find((record) => record.id === pair?.localCandidateId);
        const remote = records.find((record) => record.type === 'remote-inbound-rtp' && record.localId === primary.id);
        const statistics: StreamStatistics = {
            key,
            identity: participant.identity,
            source,
            direction: outgoing ? 'send' : 'receive',
            sampledAt: new Date().toISOString(),
            width: numeric(primary, 'frameWidth'),
            height: numeric(primary, 'frameHeight'),
            renderWidth:
                track.kind === Track.Kind.Video && track.attachedElements.length
                    ? Math.max(...track.attachedElements.map((element) => element.clientWidth))
                    : null,
            renderHeight:
                track.kind === Track.Kind.Video && track.attachedElements.length
                    ? Math.max(...track.attachedElements.map((element) => element.clientHeight))
                    : null,
            fps,
            bitrate: hasRate ? Math.round(bitrate) : null,
            codec: literal(codec, 'mimeType'),
            implementation: literal(primary, outgoing ? 'encoderImplementation' : 'decoderImplementation'),
            powerEfficient:
                typeof primary[outgoing ? 'powerEfficientEncoder' : 'powerEfficientDecoder'] === 'boolean'
                    ? (primary[outgoing ? 'powerEfficientEncoder' : 'powerEfficientDecoder'] as boolean)
                    : null,
            limitation: literal(primary, 'qualityLimitationReason'),
            packetsLost: numeric(primary, 'packetsLost') ?? numeric(remote, 'packetsLost'),
            packets: numeric(primary, outgoing ? 'packetsSent' : 'packetsReceived'),
            jitter: numeric(primary, 'jitter'),
            rtt: numeric(pair, 'currentRoundTripTime') ?? numeric(remote, 'roundTripTime'),
            framesDropped: numeric(primary, 'framesDropped'),
            freezeCount: numeric(primary, 'freezeCount'),
            processingMs,
            audioLevel: numeric(primary, 'audioLevel') ?? (source === 'microphone' ? participant.audioLevel : null),
            concealedSamples: numeric(primary, 'concealedSamples'),
            relay: candidate ? candidate.candidateType === 'relay' : null,
            protocol: literal(candidate, 'protocol'),
        };
        if (track.kind === Track.Kind.Audio) this.audioReadings.set(key, { at: performance.now(), statistics });
        return statistics;
    }
}
