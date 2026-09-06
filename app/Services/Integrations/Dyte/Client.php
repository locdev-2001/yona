<?php

namespace App\Services\Integrations\Dyte;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;

// Port từ refs/chatwoot/lib/dyte.rb — client REST của Cloudflare RealtimeKit
// (tên cũ Dyte). Trả mảng thô đã bóc khoá `data`, hoặc `['error' => …, 'error_code' => …]`.
class Client
{
    private const BASE_URL = 'https://api.cloudflare.com/client/v4';

    private const PRESET_NAME = 'group-call-host';

    private const LEGACY_PRESET_NAME = 'group_call_host';

    public function __construct(
        private readonly ?string $accountId,
        private readonly ?string $appId,
        private readonly ?string $apiToken,
    ) {
        if (blank($this->accountId) || blank($this->appId) || blank($this->apiToken)) {
            throw new InvalidArgumentException('Missing Credentials');
        }
    }

    /** @return array<string, mixed> */
    public function createAMeeting(string $title): array
    {
        return $this->processResponse($this->post('meetings', ['title' => $title]));
    }

    /** @return array<string, mixed> */
    public function addParticipantToMeeting(string $meetingId, string $clientId, string $name, string $avatarUrl): array
    {
        if (blank($meetingId) || blank($clientId) || blank($name) || blank($avatarUrl)) {
            throw new InvalidArgumentException('Missing information');
        }

        $payload = [
            'custom_participant_id' => $clientId,
            'name' => $name,
            'picture' => $avatarUrl,
            'preset_name' => self::PRESET_NAME,
        ];

        $path = "meetings/{$meetingId}/participants";
        $response = $this->processResponse($this->post($path, $payload));

        if (! $this->presetNotFound($response)) {
            return $response;
        }

        $payload['preset_name'] = self::LEGACY_PRESET_NAME;

        return $this->processResponse($this->post($path, $payload));
    }

    /** @return array<string, mixed> */
    public function refreshParticipantToken(string $meetingId, string $participantId): array
    {
        if (blank($meetingId) || blank($participantId)) {
            throw new InvalidArgumentException('Missing information');
        }

        return $this->processResponse($this->post("meetings/{$meetingId}/participants/{$participantId}/token"));
    }

    /** @return array<string, mixed> */
    public function fetchParticipants(string $meetingId): array
    {
        if (blank($meetingId)) {
            throw new InvalidArgumentException('Missing information');
        }

        return $this->processResponse($this->get("meetings/{$meetingId}/participants"));
    }

    private function presetNotFound(array $response): bool
    {
        $error = $response['error'] ?? null;

        $message = match (true) {
            is_array($error) && is_array($error['error'] ?? null) => (string) ($error['error']['message'] ?? ''),
            is_array($error) => (string) ($error['message'] ?? ''),
            default => (string) $error,
        };

        return str_contains($message, 'No preset found');
    }

    /** @return array<string, mixed> */
    private function processResponse(Response $response): array
    {
        if (! $response->successful()) {
            return ['error' => $response->json(), 'error_code' => $response->status()];
        }

        $data = $response->json('data');

        if (is_array($data)) {
            return $data;
        }

        return ['error' => 'unexpected_response', 'error_code' => $response->status()];
    }

    private function post(string $path, ?array $payload = null): Response
    {
        return Http::withHeaders(['Authorization' => "Bearer {$this->apiToken}"])
            ->post($this->url($path), $payload ?? []);
    }

    private function get(string $path): Response
    {
        return Http::withHeaders(['Authorization' => "Bearer {$this->apiToken}"])
            ->get($this->url($path));
    }

    private function url(string $path): string
    {
        return self::BASE_URL."/accounts/{$this->accountId}/realtime/kit/{$this->appId}/{$path}";
    }
}
