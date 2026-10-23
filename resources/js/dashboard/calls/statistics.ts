export type StatisticsSource = 'microphone' | 'camera' | 'screen' | 'screen_audio';

export interface StreamStatistics {
    key: string;
    identity: string;
    source: StatisticsSource;
    direction: 'send' | 'receive';
    sampledAt: string;
    width: number | null;
    height: number | null;
    renderWidth: number | null;
    renderHeight: number | null;
    fps: number | null;
    bitrate: number | null;
    previewWidth?: number | null;
    previewHeight?: number | null;
    previewFps?: number | null;
    transmissionState?: 'active' | 'waiting' | 'paused';
    codec: string | null;
    implementation: string | null;
    powerEfficient: boolean | null;
    limitation: string | null;
    packetsLost: number | null;
    packets: number | null;
    jitter: number | null;
    rtt: number | null;
    framesDropped: number | null;
    freezeCount: number | null;
    processingMs: number | null;
    audioLevel: number | null;
    concealedSamples: number | null;
    relay: boolean | null;
    protocol: string | null;
}

export interface CallStatisticsSnapshot {
    observedAt: string;
    streams: StreamStatistics[];
    longTasks: number;
    longTaskMs: number;
}

const EMPTY_SNAPSHOT: CallStatisticsSnapshot = { observedAt: '', streams: [], longTasks: 0, longTaskMs: 0 };

export class CallStatistics {
    private snapshot = EMPTY_SNAPSHOT;
    private listeners = new Set<() => void>();
    read = () => this.snapshot;
    subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };
    publish(snapshot: CallStatisticsSnapshot) {
        this.snapshot = snapshot;
        this.listeners.forEach((listener) => listener());
    }
}
