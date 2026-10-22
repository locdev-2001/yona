<?php

namespace App\Services\Calls\Telemetry;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class CallQualityReport
{
    /** @return array<string, mixed> */
    public function summary(int $days, ?string $kind): array
    {
        $samples = DB::table('call_telemetry_samples as samples')->join('calls', 'calls.id', '=', 'samples.call_id')
            ->where('samples.created_at', '>=', now()->subDays($days))
            ->when($kind, fn ($query) => $query->where('calls.kind', $kind));
        $groups = (clone $samples)->crossJoin(DB::raw('jsonb_array_elements(samples.streams) as stream'))
            ->selectRaw("calls.kind, samples.environment->>'browser' as browser, samples.environment->>'os' as os, stream->>'codec' as codec, stream->>'source' as source, stream->>'direction' as direction")
            ->selectRaw("count(*) as measurements, count(distinct samples.call_id) as calls, percentile_cont(0.5) within group (order by (stream->>'fps')::numeric) as fps_median, percentile_cont(0.5) within group (order by (stream->>'height')::numeric) as height_median")
            ->selectRaw("round(100.0 * count(*) filter (where stream->>'limitation' = 'cpu') / nullif(count(*) filter (where stream->>'limitation' is not null), 0), 1) as cpu_limited_pct")
            ->selectRaw("round(100.0 * count(*) filter (where stream->>'limitation' = 'bandwidth') / nullif(count(*) filter (where stream->>'limitation' is not null), 0), 1) as bandwidth_limited_pct")
            ->selectRaw("round(100.0 * count(*) filter (where stream->>'relay' = 'true') / nullif(count(*) filter (where stream->>'relay' is not null), 0), 1) as relay_pct")
            ->selectRaw("round(100.0 * count(*) filter (where stream->>'powerEfficient' = 'true') / nullif(count(*) filter (where stream->>'powerEfficient' is not null), 0), 1) as efficient_pct, percentile_cont(0.5) within group (order by (stream->>'processingMs')::numeric) as processing_ms_median")
            ->groupByRaw("calls.kind, samples.environment->>'browser', samples.environment->>'os', stream->>'codec', stream->>'source', stream->>'direction'")
            ->orderByDesc('measurements')->limit(100)->get();
        $events = DB::table('call_telemetry_events as events')->join('calls', 'calls.id', '=', 'events.call_id')
            ->where('events.created_at', '>=', now()->subDays($days))->when($kind, fn ($query) => $query->where('calls.kind', $kind));
        $connections = (clone $events)->selectRaw("count(*) filter (where event_name = 'connecting') as attempts, count(*) filter (where event_name = 'connected') as connected, percentile_cont(0.5) within group (order by elapsed_ms) filter (where event_name = 'connected') as connect_p50_ms, percentile_cont(0.95) within group (order by elapsed_ms) filter (where event_name = 'connected') as connect_p95_ms, percentile_cont(0.5) within group (order by elapsed_ms) filter (where event_name = 'first_audio_played') as first_audio_p50_ms, percentile_cont(0.95) within group (order by elapsed_ms) filter (where event_name = 'first_audio_played') as first_audio_p95_ms")->first();
        $recent = (clone $samples)->selectRaw('samples.call_id, calls.kind, max(samples.created_at) as last_at, count(*) as samples')->groupBy('samples.call_id', 'calls.kind')->orderByDesc('last_at')->limit(50)->get();
        $recent->each(static function ($row): void {
            $row->last_at = CarbonImmutable::parse($row->last_at, 'UTC')->toIso8601String();
        });

        return ['connections' => $connections, 'groups' => $groups, 'recent' => $recent];
    }

    /** @return array<string, mixed> */
    public function timeline(int $callId): array
    {
        $events = DB::table('call_telemetry_events')->where('call_id', $callId)->orderBy('observed_at')->limit(500)->get();
        $samples = DB::table('call_telemetry_samples')->where('call_id', $callId)->orderByDesc('observed_at')->limit(100)->get();
        $events->concat($samples)->each(static function ($row): void {
            $row->observed_at = CarbonImmutable::parse($row->observed_at, 'UTC')->toIso8601String();
        });

        return ['events' => $events, 'samples' => $samples];
    }
}
