<?php

namespace App\Services\Instagram;

use App\Messaging\Delivery\ChoiceToken;
use App\Messaging\Inbound\InboundMessageWriter;
use App\Messaging\Inbound\InboundSender;
use App\Messaging\Inbound\MessageEventService;
use App\Models\Channel\FacebookPage;
use App\Models\Channel\Instagram;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Messaging\ChoiceCallbackService;
use Illuminate\Support\Facades\Log;

/**
 * Một phần tử `messaging` của Instagram — một đường cho cả kênh Instagram login trực tiếp
 * lẫn Instagram gắn qua trang Facebook (khác nhau ở nơi lấy hồ sơ người dùng). Sự kiện
 * (thu hồi, cảm xúc, đã xem) và tin đến đều đi qua lõi.
 */
class MessageTextService
{
    private readonly MessageParser $payload;

    /**
     * @param  array<string, mixed>  $messaging
     * @param  Instagram|FacebookPage  $channel
     */
    public function __construct(array $messaging, private readonly object $channel)
    {
        $this->payload = new MessageParser($messaging);
    }

    public function perform(): ?Message
    {
        $inbox = $this->channel->inbox;

        if ($inbox === null || $this->channel->reauthorizationRequired()) {
            return null;
        }

        foreach ($this->payload->events() as $event) {
            app(MessageEventService::class)->apply($inbox, $event);
        }

        if (! $this->payload->hasMessage() || $this->payload->isDeleted()) {
            return null;
        }

        if (! $this->payload->isEcho() && $this->handleQuickReply($inbox)) {
            return null;
        }

        $contactSourceId = $this->payload->contactSourceId();

        if ($contactSourceId === null) {
            return null;
        }

        return app(InboundMessageWriter::class)->write($inbox, $this->sender($inbox, $contactSourceId), $this->payload->inboundMessage());
    }

    /**
     * Khách bấm chip do DeliveryPlanner vẽ (Renderers\InstagramRenderer): map thẳng về tin
     * gốc qua SubmissionService thay vì tạo tin đến mang payload thô. Payload không phải của
     * chúng ta, hoặc câu hỏi đã được trả lời rồi, thì để rơi xuống luồng tạo tin bình thường
     * để chữ khách bấm vẫn tới nhân viên.
     */
    private function handleQuickReply(Inbox $inbox): bool
    {
        $parsed = ChoiceToken::parseFacebook((string) $this->payload->quickReplyPayload());
        $senderId = $this->payload->senderId();

        if ($parsed === null || $senderId === null) {
            return false;
        }

        return app(ChoiceCallbackService::class)
            ->resolve($parsed['message_id'], $parsed['value'], null, $inbox->id, $senderId) !== null;
    }

    /** Hồ sơ Instagram chỉ tra khi khách chưa có trong hộp thư. */
    private function sender(Inbox $inbox, string $contactSourceId): InboundSender
    {
        if ($inbox->contactInboxes()->where('source_id', $contactSourceId)->exists()) {
            return new InboundSender($contactSourceId);
        }

        $profile = (new InstagramProfileFetcher($this->channel))->fetch($contactSourceId);

        if (blank($profile)) {
            Log::warning("[INSTAGRAM] Không lấy được hồ sơ người dùng {$contactSourceId} cho inbox {$inbox->id}");
        }

        return new InboundSender(
            sourceId: $contactSourceId,
            name: $profile['name'] ?? null,
            avatarUrl: $profile['profile_pic'] ?? null,
            additionalAttributes: $this->instagramAttributes($profile),
        );
    }

    /**
     * @param  array<string, mixed>  $profile
     * @return array<string, mixed>
     */
    private function instagramAttributes(array $profile): array
    {
        if (blank($profile['username'] ?? null)) {
            return [];
        }

        $attributes = [
            'social_profiles' => ['instagram' => $profile['username']],
            'social_instagram_user_name' => $profile['username'],
        ];

        foreach (['follower_count', 'is_user_follow_business', 'is_business_follow_user', 'is_verified_user'] as $field) {
            if (($profile[$field] ?? null) !== null) {
                $attributes["social_instagram_{$field}"] = $profile[$field];
            }
        }

        return $attributes;
    }
}
