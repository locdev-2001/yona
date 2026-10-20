<?php

namespace App\Services\Calls\Media\LiveKit;

use App\Services\Calls\Media\InvalidMediaWebhook;
use App\Services\Calls\Media\MediaWebhooks;
use App\Services\Calls\Media\RoomEvent;
use App\Services\Calls\Media\RoomEventType;
use App\Services\Calls\Media\WebhookDelivery;
use Carbon\CarbonImmutable;
use Throwable;

// Webhook LiveKit: header Authorization mang JWT ký bằng API secret, claim `sha256` là
// base64(sha256(thân thô)). Thân là protojson (camelCase, số int64 ở dạng chuỗi).
final readonly class LiveKitWebhooks implements MediaWebhooks
{
    private const EVENT_TYPES = [
        'room_started' => RoomEventType::RoomStarted,
        'room_finished' => RoomEventType::RoomFinished,
        'participant_joined' => RoomEventType::ParticipantJoined,
        'participant_left' => RoomEventType::ParticipantLeft,
        // Kết nối hỏng giữa chừng: với lõi là người đó không còn trong phòng.
        'participant_connection_aborted' => RoomEventType::ParticipantLeft,
        'track_published' => RoomEventType::TrackPublished,
        'track_unpublished' => RoomEventType::TrackUnpublished,
    ];

    public function __construct(private LiveKitTokenSigner $signer) {}

    public function parse(WebhookDelivery $delivery): ?RoomEvent
    {
        $this->verifySignature($delivery);

        $payload = json_decode($delivery->body, true);
        $type = self::EVENT_TYPES[$payload['event'] ?? ''] ?? null;
        $room = $payload['room']['name'] ?? null;

        if ($type === null || ! is_string($room)) {
            return null;
        }

        return new RoomEvent(
            $type,
            $room,
            isset($payload['createdAt']) ? CarbonImmutable::createFromTimestamp((int) $payload['createdAt']) : CarbonImmutable::now(),
            $payload['participant']['identity'] ?? null,
            LiveKitSources::fromTrackSource($payload['track']['source'] ?? null),
            $payload['participant']['name'] ?? null,
        );
    }

    private function verifySignature(WebhookDelivery $delivery): void
    {
        $token = preg_replace('/^Bearer\s+/i', '', (string) $delivery->header('Authorization'));

        if ($token === '') {
            throw new InvalidMediaWebhook('Missing Authorization header');
        }

        try {
            $claims = $this->signer->verify($token);
        } catch (Throwable $exception) {
            throw new InvalidMediaWebhook('Invalid webhook token: '.$exception->getMessage(), 0, $exception);
        }

        $bodyDigest = base64_encode(hash('sha256', $delivery->body, true));

        if (! is_string($claims['sha256'] ?? null) || ! hash_equals($claims['sha256'], $bodyDigest)) {
            throw new InvalidMediaWebhook('Webhook body does not match its signature');
        }
    }
}
