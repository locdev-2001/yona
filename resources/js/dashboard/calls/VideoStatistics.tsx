import type { StreamStatistics } from './statistics';
import { t } from '../../i18n';
import { screenBelowRequirement, screenRequirementLabel } from './qualityProfile';

export default function VideoStatistics({ statistics, source }: { statistics: StreamStatistics | undefined; source: 'camera' | 'screen' }) {
    const size = statistics?.width && statistics.height ? `${statistics.width}×${statistics.height}` : '…';
    const belowRequirement = source === 'screen' && statistics && screenBelowRequirement(statistics);
    return (
        <output
            className={`pointer-events-none absolute top-2 start-2 max-w-full rounded-lg bg-black/75 px-2 py-1 font-mono text-xs tabular-nums ${belowRequirement ? 'text-n-amber-9' : 'text-white'}`}
        >
            {size} · {statistics?.fps === null || !statistics ? '…' : Math.round(statistics.fps)} FPS ·{' '}
            {statistics?.bitrate === null || !statistics ? '…' : `${Math.round(statistics.bitrate / 1000)} kbps`}
            <span className="sr-only">{t(statistics?.direction === 'send' ? 'CALLS.QUALITY.SENDING' : 'CALLS.QUALITY.RECEIVING')}</span>
            {belowRequirement ? <span className="block font-sans">{t('CALLS.QUALITY.BELOW_REQUIREMENT', screenRequirementLabel())}</span> : null}
        </output>
    );
}
