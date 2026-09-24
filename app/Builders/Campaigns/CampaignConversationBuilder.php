<?php

namespace App\Builders\Campaigns;

use App\Builders\Messages\MessageBuilder;
use App\Models\Campaign;
use App\Models\ContactInbox;
use App\Models\Conversation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class CampaignConversationBuilder
{
    /**
     * @param  array<string, mixed>  $conversationAdditionalAttributes
     * @param  array<string, mixed>  $customAttributes
     */
    public function __construct(
        private readonly int $contactInboxId,
        private readonly int|string $campaignDisplayId,
        private readonly array $conversationAdditionalAttributes = [],
        private readonly array $customAttributes = [],
    ) {}

    public function perform(): ?Conversation
    {
        try {
            return DB::transaction(function (): Conversation {
                $contactInbox = ContactInbox::query()->lockForUpdate()->findOrFail($this->contactInboxId);

                /** @var Campaign $campaign */
                $campaign = $contactInbox->inbox->campaigns()
                    ->where('display_id', $this->campaignDisplayId)
                    ->firstOrFail();

                // Đã có hội thoại thì không nhả campaign nữa.
                if ($contactInbox->conversations()->exists()) {
                    throw new \RuntimeException('Conversation already present');
                }

                $conversation = Conversation::query()->create([
                    'account_id' => $campaign->account_id,
                    'inbox_id' => $contactInbox->inbox_id,
                    'contact_id' => $contactInbox->contact_id,
                    'contact_inbox_id' => $contactInbox->id,
                    'campaign_id' => $campaign->id,
                    'additional_attributes' => $this->conversationAdditionalAttributes,
                    'custom_attributes' => $this->customAttributes,
                ]);

                (new MessageBuilder($campaign->sender, $conversation, [
                    'content' => $campaign->message,
                    'campaign_id' => $campaign->id,
                ]))->perform();

                return $conversation;
            });
        } catch (Throwable $exception) {
            Log::info($exception->getMessage());

            return null;
        }
    }
}
