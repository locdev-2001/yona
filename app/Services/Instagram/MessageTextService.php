<?php

namespace App\Services\Instagram;

use App\Builders\Messages\Instagram\MessageBuilder;
use App\Jobs\Avatar\AvatarFromUrlJob;
use App\Messaging\Delivery\ChoiceToken;
use App\Models\Channel\FacebookPage;
use App\Models\Channel\Instagram;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Messaging\ChoiceCallbackService;
use Illuminate\Support\Facades\Log;

/**
 * webhooks_base_service}.rb — một đường cho cả kênh Instagram login trực tiếp
 * lẫn Instagram gắn qua trang Facebook (khác nhau ở nơi lấy hồ sơ người dùng).
 */
class MessageTextService
{
    /**
     * @param  array<string, mixed>  $messaging
     * @param  Instagram|FacebookPage  $channel
     */
    public function __construct(
        private readonly array $messaging,
        private readonly object $channel,
    ) {}

    public function perform(): ?Message
    {
        $inbox = $this->channel->inbox;

        if ($inbox === null || $this->channel->reauthorizationRequired()) {
            return null;
        }

        if (filled(data_get($this->messaging, 'message.is_deleted'))) {
            $this->unsendMessage($inbox);

            return null;
        }

        $isEcho = filled(data_get($this->messaging, 'message.is_echo'));

        if (! $isEcho && $this->handleQuickReply($inbox)) {
            return null;
        }

        $contactId = (string) ($isEcho
            ? data_get($this->messaging, 'recipient.id')
            : data_get($this->messaging, 'sender.id'));

        if ($inbox->contactInboxes()->where('source_id', $contactId)->doesntExist()) {
            $this->ensureContact($inbox, $contactId);
        }

        return (new MessageBuilder($this->messaging, $inbox, outgoingEcho: $isEcho))->perform();
    }

    /**
     * Khách bấm chip do DeliveryPlanner vẽ (Renderers\InstagramRenderer): map thẳng về tin
     * gốc qua SubmissionService thay vì tạo tin đến mang payload thô. Payload không phải của
     * chúng ta, hoặc câu hỏi đã được trả lời rồi, thì để rơi xuống luồng tạo tin bình thường
     * để chữ khách bấm vẫn tới nhân viên (App\Services\Facebook\MessageCreator làm y hệt).
     */
    private function handleQuickReply(Inbox $inbox): bool
    {
        $parsed = ChoiceToken::parseFacebook((string) data_get($this->messaging, 'message.quick_reply.payload'));
        $senderId = data_get($this->messaging, 'sender.id');

        if ($parsed === null || $senderId === null) {
            return false;
        }

        return app(ChoiceCallbackService::class)
            ->resolve($parsed['message_id'], $parsed['value'], null, $inbox->id, (string) $senderId) !== null;
    }

    private function unsendMessage(Inbox $inbox): void
    {
        $message = $inbox->messages()->where('source_id', data_get($this->messaging, 'message.mid'))->first();

        if ($message === null) {
            return;
        }

        $message->attachments()->delete();
        $message->update(['content' => __('conversations.messages.deleted'), 'deleted' => true]);
    }

    private function ensureContact(Inbox $inbox, string $contactId): void
    {
        $profile = (new InstagramProfileFetcher($this->channel))->fetch($contactId);

        if (blank($profile)) {
            Log::warning("[INSTAGRAM] Không lấy được hồ sơ người dùng {$contactId} cho inbox {$inbox->id}");
            $profile = ['id' => $contactId, 'name' => "Unknown (IG: {$contactId})"];
        }

        $contactInbox = $this->channel->createContactInbox($contactId, $profile['name'] ?? null);

        if ($contactInbox === null) {
            return;
        }

        $contactInbox->contact->update([
            'additional_attributes' => [
                ...$contactInbox->contact->additional_attributes ?? [],
                ...$this->instagramAttributes($profile),
            ],
        ]);

        if (filled($profile['profile_pic'] ?? null)) {
            AvatarFromUrlJob::dispatch($contactInbox->contact, $profile['profile_pic']);
        }
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
