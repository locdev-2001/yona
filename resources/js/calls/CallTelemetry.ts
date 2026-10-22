import { xsrfToken } from 'dashboard/helper/apiClient';
import { CallStatistics } from 'dashboard/calls/statistics';

interface TelemetryEvent {
    event_id: string;
    event_name: string;
    observed_at: string;
    elapsed_ms: number | null;
    attributes: Record<string, string | number | boolean | null>;
}

function environment() {
    const agent = navigator.userAgent;
    const browser = agent.match(/(Edg)\/(\d+)/) ?? agent.match(/(Firefox|Chrome|Version)\/(\d+)/);
    const os = /Android/.test(agent)
        ? 'Android'
        : /iPhone|iPad/.test(agent)
          ? 'iOS'
          : /Windows/.test(agent)
            ? 'Windows'
            : /Mac/.test(agent)
              ? 'macOS'
              : /Linux/.test(agent)
                ? 'Linux'
                : 'other';
    const connection = (navigator as Navigator & { connection?: { effectiveType?: string; type?: string } }).connection;
    const entry = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/build/"]')?.src;
    const build = entry ? (new URL(entry).pathname.split('/').pop() ?? null) : null;
    return {
        browser: browser?.[1] ?? 'other',
        browser_major: browser?.[2] ?? null,
        os,
        mobile: /Mobile|Android|iPhone|iPad/.test(agent),
        pwa: matchMedia('(display-mode: standalone)').matches,
        effective_type: ['slow-2g', '2g', '3g', '4g'].includes(connection?.effectiveType ?? '') ? connection?.effectiveType : null,
        connection_type: ['wifi', 'cellular', 'ethernet', 'bluetooth', 'wimax', 'other', 'none', 'unknown'].includes(connection?.type ?? '')
            ? connection?.type
            : null,
        build,
    };
}

export class CallTelemetry {
    private static lifecycleKeys = new Set<string>();
    static reportLifecycle(callId: number, name: string) {
        const key = `${callId}:${name}`;
        if (this.lifecycleKeys.has(key)) return;
        this.lifecycleKeys.add(key);
        if (this.lifecycleKeys.size > 256) this.lifecycleKeys.delete(this.lifecycleKeys.values().next().value!);
        const reporter = new CallTelemetry(callId, new CallStatistics());
        reporter.event(name, {}, null);
        void reporter.flush();
    }
    private readonly sessionId = crypto.randomUUID();
    private readonly startedAt = performance.now();
    private events: TelemetryEvent[] = [];
    private sequence = 0;
    private timer?: ReturnType<typeof setInterval>;
    private sending = false;
    private pendingSample: Record<string, unknown> | null = null;
    private disabled = false;
    private stopping = false;
    private finalAttempted = false;
    private readonly environment = environment();

    constructor(
        private callId: number,
        private statistics: CallStatistics,
    ) {}

    start() {
        this.event('connecting');
        this.timer = setInterval(() => {
            void this.flush();
        }, 15_000);
        window.addEventListener('pagehide', this.onPageHide);
    }
    event(name: string, attributes: TelemetryEvent['attributes'] = {}, elapsedMs?: number | null) {
        this.events.push({
            event_id: crypto.randomUUID(),
            event_name: name,
            observed_at: new Date().toISOString(),
            elapsed_ms: elapsedMs === undefined ? Math.round(performance.now() - this.startedAt) : elapsedMs,
            attributes,
        });
        this.events = this.events.slice(-30);
    }
    stop() {
        this.stopping = true;
        this.event('left');
        clearInterval(this.timer);
        window.removeEventListener('pagehide', this.onPageHide);
        void this.flush(true);
    }
    private onPageHide = () => {
        this.event('page_hidden');
        void this.flush(true);
    };

    private async flush(keepalive = false) {
        if (this.disabled || this.sending) return;
        if (keepalive) this.finalAttempted = true;
        const snapshot = this.statistics.read();
        if (!this.pendingSample && snapshot.observedAt) {
            this.pendingSample = {
                sequence: ++this.sequence,
                observed_at: snapshot.observedAt,
                interval_ms: 15_000,
                environment: this.environment,
                streams: snapshot.streams.slice(0, 64),
                performance: { long_tasks: snapshot.longTasks, long_task_ms: snapshot.longTaskMs },
            };
        }
        if (!this.events.length && !this.pendingSample) return;
        const events = this.events.slice(0, 30);
        const payload = JSON.stringify({ client_session_id: this.sessionId, events, samples: this.pendingSample ? [this.pendingSample] : [] });
        if (new Blob([payload]).size > 60_000) {
            this.pendingSample = null;
            return;
        }
        this.sending = true;
        try {
            const response = await fetch(`/api/v1/calls/${this.callId}/telemetry`, {
                method: 'POST',
                credentials: 'same-origin',
                keepalive,
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': xsrfToken() },
                body: payload,
                signal: AbortSignal.timeout(8000),
            });
            if (response.ok) {
                const sent = new Set(events.map((event) => event.event_id));
                this.events = this.events.filter((event) => !sent.has(event.event_id));
                this.pendingSample = null;
            }
            if ([401, 403, 404].includes(response.status)) this.disabled = true;
        } catch {
            /* Không để việc gửi số liệu làm gián đoạn cuộc gọi; hàng đợi có giới hạn. */
        } finally {
            this.sending = false;
            if (this.stopping && !this.finalAttempted) void this.flush(true);
        }
    }
}
