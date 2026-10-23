<?php

namespace App\Services\Calls\Telemetry;

use App\Models\Call;
use App\Models\User;
use App\Services\Calls\Kinds\CallKinds;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final readonly class CallTelemetry
{
    public function __construct(private CallKinds $kinds, private TelemetryPayload $payload) {}

    /** @param array<string, mixed> $input */
    public function record(Call $call, User $actor, array $input): void
    {
        abort_if($call->ended_at !== null && $call->ended_at->lt(now()->subMinutes(15)), 403);
        $participant = $call->participants()->where('user_id', $actor->id)->latest('joined_at')->first();
        if ($participant === null) {
            abort_unless($this->kinds->policyOf($call)->mayReportTelemetry($call, $actor), 403);
        }
        $payload = $this->payload->validate($input);
        $base = ['call_id' => $call->id, 'user_id' => $actor->id, 'call_participant_id' => $participant?->id, 'client_session_id' => $payload['client_session_id'], 'created_at' => now()];
        $timestamp = static fn (string $value): string => CarbonImmutable::parse($value)->utc()->format('Y-m-d H:i:s.u');
        DB::transaction(function () use ($payload, $base, $timestamp): void {
            $events = array_map(static fn (array $event): array => [...$base, ...$event, 'elapsed_ms' => $event['elapsed_ms'] ?? null, 'observed_at' => $timestamp($event['observed_at']), 'attributes' => json_encode($event['attributes'], JSON_THROW_ON_ERROR)], $payload['events']);
            $samples = array_map(static fn (array $sample): array => [...$base, ...$sample, 'observed_at' => $timestamp($sample['observed_at']), 'environment' => json_encode($sample['environment'], JSON_THROW_ON_ERROR), 'streams' => json_encode($sample['streams'], JSON_THROW_ON_ERROR), 'performance' => json_encode($sample['performance'], JSON_THROW_ON_ERROR)], $payload['samples']);
            if ($events !== []) {
                DB::table('call_telemetry_events')->insertOrIgnore($events);
            }
            if ($samples !== []) {
                DB::table('call_telemetry_samples')->insertOrIgnore($samples);
            }
        });
    }
}
