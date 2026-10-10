<?php

namespace App\Builders;

use App\Channels\AddressesContacts;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Inbox;
use RuntimeException;

// source_id không truyền vào thì kênh tự suy từ hồ sơ liên hệ (AddressesContacts).
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

    private function generateSourceId(): ?string
    {
        $channel = $this->inbox->channel;

        if (! $channel instanceof AddressesContacts) {
            throw new RuntimeException("Unsupported operation for this channel: {$this->inbox->channel_type}");
        }

        return $channel->contactSourceId($this->contact);
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
