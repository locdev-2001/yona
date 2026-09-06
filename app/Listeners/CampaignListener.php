<?php

namespace App\Listeners;

use App\Builders\Campaigns\CampaignConversationBuilder;
use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\ContactInbox;

// Port từ refs/chatwoot/app/listeners/campaign_listener.rb — widget bắn
// `campaign.triggered` qua /api/v1/widget/events, listener dựng hội thoại.
// Laravel tự đăng ký qua event discovery (handle(DomainEvent)).
class CampaignListener extends BaseListener
{
    public function handle(DomainEvent $event): void
    {
        if ($event->type !== EventType::CAMPAIGN_TRIGGERED) {
            return;
        }

        $this->campaignTriggered($event);
    }

    public function campaignTriggered(DomainEvent $event): void
    {
        /** @var ContactInbox $contactInbox */
        $contactInbox = $event->data['contact_inbox'];
        $eventInfo = (array) ($event->data['event_info'] ?? []);
        $campaignDisplayId = $eventInfo['campaign_id'] ?? null;

        if (blank($campaignDisplayId)) {
            return;
        }

        (new CampaignConversationBuilder(
            contactInboxId: $contactInbox->id,
            campaignDisplayId: $campaignDisplayId,
            conversationAdditionalAttributes: collect($eventInfo)->except(['campaign_id', 'custom_attributes'])->all(),
            customAttributes: (array) ($eventInfo['custom_attributes'] ?? []),
        ))->perform();
    }
}
