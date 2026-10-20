<?php

namespace App\Services\Calls\Media\LiveKit;

use App\Services\Calls\Media\MediaProviderFailed;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

// RoomService của LiveKit qua Twirp JSON: POST {host}/twirp/livekit.RoomService/{Method},
// mỗi lời gọi mang một token ngắn hạn có đúng grant cần cho method đó.
final readonly class LiveKitRoomService
{
    private const PATH = '/twirp/livekit.RoomService/';

    private const SERVER_TOKEN_TTL_SECONDS = 60;

    private const TIMEOUT_SECONDS = 5;

    private const TWIRP_NOT_FOUND = 'not_found';

    public function __construct(
        private LiveKitCredentials $credentials,
        private LiveKitTokenSigner $signer,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $videoGrant
     * @return array<string, mixed>|null null khi phòng/người không còn
     */
    public function call(string $method, array $payload, array $videoGrant): ?array
    {
        $token = $this->signer->sign(['video' => $videoGrant], self::SERVER_TOKEN_TTL_SECONDS);

        try {
            $response = Http::withToken($token)
                ->acceptJson()
                ->timeout(self::TIMEOUT_SECONDS)
                ->post($this->credentials->apiBaseUrl().self::PATH.$method, $payload);
        } catch (ConnectionException $exception) {
            throw MediaProviderFailed::because("LiveKit {$method} unreachable", $exception);
        }

        if ($response->successful()) {
            return $response->json() ?? [];
        }

        if ($response->json('code') === self::TWIRP_NOT_FOUND) {
            return null;
        }

        throw MediaProviderFailed::because("LiveKit {$method} failed: HTTP {$response->status()} {$response->body()}");
    }
}
