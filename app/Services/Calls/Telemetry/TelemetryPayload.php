<?php

namespace App\Services\Calls\Telemetry;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

final class TelemetryPayload
{
    private const NUMERIC_METRICS = [
        'width' => 32768, 'height' => 32768, 'renderWidth' => 32768, 'renderHeight' => 32768, 'fps' => 1000, 'bitrate' => 1000000000,
        'previewWidth' => 32768, 'previewHeight' => 32768, 'previewFps' => 1000,
        'packetsLost' => 1000000000000, 'packets' => 1000000000000, 'jitter' => 3600,
        'rtt' => 3600, 'framesDropped' => 1000000000000, 'freezeCount' => 1000000000,
        'processingMs' => 3600000, 'audioLevel' => 1, 'concealedSamples' => 1000000000000000,
    ];

    /** @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function validate(array $payload): array
    {
        $fields = implode(',', [...array_keys(self::NUMERIC_METRICS), 'key', 'identity', 'source', 'direction', 'sampledAt', 'codec', 'implementation', 'limitation', 'protocol', 'powerEfficient', 'relay', 'transmissionState']);
        $rules = [
            'client_session_id' => ['required', 'uuid'],
            'events' => ['present', 'array', 'max:30'],
            'events.*' => ['array:event_id,event_name,observed_at,elapsed_ms,attributes'],
            'events.*.event_id' => ['required', 'uuid'],
            'events.*.event_name' => ['required', Rule::in(['first_audio_played', 'stage_visible', 'call_requested', 'join_requested', 'ringing', 'answered', 'declined', 'missed', 'ended', 'cancelled', 'connecting', 'connected', 'connection_failed', 'disconnected', 'reconnecting', 'reconnected', 'left', 'page_hidden', 'microphone_changed', 'camera_changed', 'screen_changed', 'device_changed', 'noise_filter_changed', 'noise_filter_fallback', 'noise_filter_error', 'audio_playback_blocked', 'media_error'])],
            'events.*.observed_at' => ['required', 'date', 'after:'.now()->subDay()->toIso8601String(), 'before:'.now()->addDay()->toIso8601String()],
            'events.*.elapsed_ms' => ['nullable', 'integer', 'min:0', 'max:2147483647'],
            'events.*.attributes' => ['present', 'array:reason,kind,mode,enabled,error_code'],
            'events.*.attributes.error_code' => ['sometimes', Rule::in(['quality_requirement', 'permission_denied', 'security_restriction', 'device_not_found', 'device_busy', 'constraints', 'capture_aborted', 'unknown'])],
            'events.*.attributes.reason' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'events.*.attributes.kind' => ['sometimes', Rule::in(['audioinput', 'audiooutput', 'videoinput', 'microphone', 'camera', 'screen'])],
            'events.*.attributes.mode' => ['sometimes', Rule::in(['off', 'browser', 'enhanced'])],
            'events.*.attributes.enabled' => ['sometimes', 'boolean'],
            'samples' => ['present', 'array', 'max:2'],
            'samples.*' => ['array:sequence,observed_at,interval_ms,environment,streams,performance'],
            'samples.*.sequence' => ['required', 'integer', 'min:1', 'max:2147483647'],
            'samples.*.observed_at' => ['required', 'date', 'after:'.now()->subDay()->toIso8601String(), 'before:'.now()->addDay()->toIso8601String()],
            'samples.*.interval_ms' => ['required', 'integer', 'between:1,120000'],
            'samples.*.environment' => ['required', 'array:browser,browser_major,os,mobile,pwa,network,effective_type,connection_type,build'],
            'samples.*.environment.build' => ['nullable', 'string', 'max:100', 'regex:/^[a-zA-Z0-9_.-]+$/'],
            'samples.*.environment.browser' => ['required', Rule::in(['Edg', 'Firefox', 'Chrome', 'Version', 'other'])],
            'samples.*.environment.browser_major' => ['nullable', 'regex:/^\d{1,4}$/'],
            'samples.*.environment.os' => ['required', Rule::in(['Android', 'iOS', 'Windows', 'macOS', 'Linux', 'other'])],
            'samples.*.environment.mobile' => ['required', 'boolean'],
            'samples.*.environment.pwa' => ['required', 'boolean'],
            'samples.*.environment.network' => ['nullable', Rule::in(['slow-2g', '2g', '3g', '4g'])],
            'samples.*.environment.effective_type' => ['nullable', Rule::in(['slow-2g', '2g', '3g', '4g'])],
            'samples.*.environment.connection_type' => ['nullable', Rule::in(['wifi', 'cellular', 'ethernet', 'bluetooth', 'wimax', 'other', 'none', 'unknown'])],
            'samples.*.streams' => ['present', 'array', 'max:128'],
            'samples.*.streams.*' => ["array:{$fields}"],
            'samples.*.streams.*.key' => ['required', 'string', 'max:160', 'regex:/^[a-zA-Z0-9:_-]+$/'],
            'samples.*.streams.*.identity' => ['required', 'string', 'max:100', 'regex:/^(user:\d+|guest:[a-zA-Z0-9_-]+)$/'],
            'samples.*.streams.*.source' => ['required', Rule::in(['microphone', 'camera', 'screen', 'screen_audio'])],
            'samples.*.streams.*.direction' => ['required', Rule::in(['send', 'receive'])],
            'samples.*.streams.*.transmissionState' => ['sometimes', Rule::in(['active', 'waiting', 'paused'])],
            'samples.*.streams.*.sampledAt' => ['nullable', 'date'],
            'samples.*.streams.*.powerEfficient' => ['nullable', 'boolean'],
            'samples.*.streams.*.relay' => ['nullable', 'boolean'],
            'samples.*.streams.*.limitation' => ['nullable', Rule::in(['none', 'cpu', 'bandwidth', 'other'])],
            'samples.*.streams.*.protocol' => ['nullable', Rule::in(['udp', 'tcp', 'tls'])],
            'samples.*.streams.*.codec' => ['nullable', 'string', 'max:100', 'regex:/^[a-zA-Z0-9.\/_-]+$/'],
            'samples.*.streams.*.implementation' => ['nullable', 'string', 'max:100', 'regex:/^[\x20-\x7E]+$/'],
            'samples.*.performance' => ['required', 'array:long_tasks,long_task_ms'],
            'samples.*.performance.long_tasks' => ['required', 'integer', 'between:0,1000000000'],
            'samples.*.performance.long_task_ms' => ['required', 'numeric', 'between:0,1000000000000'],
        ];
        foreach (self::NUMERIC_METRICS as $field => $maximum) {
            $rules["samples.*.streams.*.{$field}"] = ['nullable', 'numeric', 'min:0', "max:{$maximum}"];
        }
        $rules['samples.*.streams.*.packetsLost'] = ['nullable', 'numeric', 'between:-1000000000000,1000000000000'];

        return Validator::make($payload, $rules)->validate();
    }
}
