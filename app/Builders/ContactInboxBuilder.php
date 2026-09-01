<?php

namespace App\Builders;

use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Inbox;
use Illuminate\Support\Str;
use RuntimeException;

// Port từ refs/chatwoot/app/builders/contact_inbox_builder.rb.
// B2 mới có kênh API — nhánh sinh source_id của Email/Sms/Twilio/Whatsapp
// (kèm vá RecordNotUnique đổi source_id cũ) port cùng driver kênh đó.
class ContactInboxBuilder
{
    public function __construct(
        private readonly Contact $contact,
        private readonly Inbox $inbox,
        private ?string $sourceId = null,
        private readonly bool $hmacVerified = false,
    ) {}

    public function perform(): ?ContactInbox
    {
        $this->sourceId ??= $this->generateSourceId();

        return filled($this->sourceId) ? $this->createContactInbox() : null;
    }

    private function generateSourceId(): string
    {
        return match ($this->inbox->channel_type) {
            'Channel::Api', 'Channel::WebWidget' => (string) Str::uuid(),
            default => throw new RuntimeException(
                "Unsupported operation for this channel: {$this->inbox->channel_type}"
            ),
        };
    }

    private function createContactInbox(): ContactInbox
    {
        return ContactInbox::query()->firstOrCreate([
            'contact_id' => $this->contact->id,
            'inbox_id' => $this->inbox->id,
            'source_id' => $this->sourceId,
        ], [
            'hmac_verified' => $this->hmacVerified,
        ]);
    }
}
