<?php

namespace App\Services\Instagram;

use App\Builders\Messages\Instagram\MessageBuilder;
use App\Jobs\Avatar\AvatarFromUrlJob;
use App\Models\Channel\FacebookPage;
use App\Models\Channel\Instagram;
use App\Models\Inbox;
use App\Models\Message;
use Illuminate\Support\Facades\Log;

/**
 * Port từ refs/chatwoot/app/services/instagram/{base_message_text,message_text,
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
        $contactId = (string) ($isEcho
            ? data_get($this->messaging, 'recipient.id')
            : data_get($this->messaging, 'sender.id'));

        if ($inbox->contactInboxes()->where('source_id', $contactId)->doesntExist()) {
            $this->ensureContact($inbox, $contactId);
        }

        return (new MessageBuilder($this->messaging, $inbox, outgoingEcho: $isEcho))->perform();
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
