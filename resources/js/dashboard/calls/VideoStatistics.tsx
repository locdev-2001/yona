import type { StreamStatistics } from './statistics';
import { t } from '../../i18n';
import { screenBelowRequirement, screenRequirementLabel } from './qualityProfile';

export default function VideoStatistics({ statistics, source, compact = false }: { statistics: StreamStatistics | undefined; source: 'camera' | 'screen'; compact?: boolean }) {
    const size = statistics?.width && statistics.height ? `${statistics.width}×${statistics.height}` : '…';
    const previewSize = statistics?.previewWidth && statistics.previewHeight ? `${statistics.previewWidth}×${statistics.previewHeight}` : '…';
    const isSending = statistics?.direction === 'send';
    const belowRequirement = source === 'screen' && statistics && screenBelowRequirement(statistics);
    const stateLabel = statistics?.transmissionState === 'waiting'
        ? 'CALLS.QUALITY.WAITING_VIEWERS'
        : statistics?.transmissionState === 'paused'
          ? 'CALLS.QUALITY.TRANSMISSION_PAUSED'
          : isSending ? 'CALLS.QUALITY.SENDING' : 'CALLS.QUALITY.RECEIVING';
    if (compact) return (
        <output className="pointer-events-none absolute top-2 start-2 max-w-[calc(100%-1rem)] rounded-lg bg-n-black/80 px-2 py-1 font-mono text-xs tabular-nums text-white">
            {isSending ? `${t('CALLS.QUALITY.PREVIEW')} · ${previewSize} · ${statistics?.previewFps == null ? '…' : Math.round(statistics.previewFps)}` : `${size} · ${statistics?.fps == null ? '…' : Math.round(statistics.fps)}`} FPS
        </output>
    );
    return (
        <output
            className={`pointer-events-none absolute top-2 start-2 max-w-[calc(100%-1rem)] rounded-lg bg-n-black/80 px-2 py-1 font-mono text-xs tabular-nums ${belowRequirement ? 'text-n-amber-9' : 'text-white'}`}
        >
            {isSending ? <span className="block">{t('CALLS.QUALITY.PREVIEW')} · {previewSize} · {statistics?.previewFps == null ? '…' : Math.round(statistics.previewFps)} FPS</span> : null}
            <span className="block font-sans">{t(stateLabel)}</span>
            {size} · {statistics?.fps === null || !statistics ? '…' : Math.round(statistics.fps)} FPS ·{' '}
            {statistics?.bitrate === null || !statistics ? '…' : `${Math.round(statistics.bitrate / 1000)} kbps`}
            {belowRequirement ? <span className="block font-sans">{t('CALLS.QUALITY.BELOW_REQUIREMENT', screenRequirementLabel())}</span> : null}
        </output>
    );
}
