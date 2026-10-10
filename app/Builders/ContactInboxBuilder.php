<?php

namespace App\Builders;

use App\Channels\AddressesContacts;
use App\Channels\Capability;
use App\Channels\ChecksContactAddress;
use App\Channels\UndeliverableContactAddress;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Inbox;
use RuntimeException;

/**
 * source_id không truyền vào thì kênh tự suy từ hồ sơ liên hệ (AddressesContacts); kênh
 * không suy được nhưng khai mở lại hội thoại thì dùng địa chỉ khách đã có ở hộp thư đó.
 */
class ContactInboxBuilder
{
    public function __construct(
        private readonly Contact $contact,
        private readonly Inbox $inbox,
        private ?string $sourceId = null,
        private readonly bool $hmacVerified = false,
    ) {}

    /** @throws UndeliverableContactAddress */
    public function perform(): ?ContactInbox
    {
        if ($this->sourceId === null && $this->resumesKnownAddress()) {
            return $this->latestKnownContactInbox();
        }

        $this->sourceId ??= $this->generateSourceId();

        return filled($this->sourceId) ? $this->createContactInbox() : null;
    }

    private function resumesKnownAddress(): bool
    {
        return ! $this->inbox->channel instanceof AddressesContacts
            && $this->inbox->supports(Capability::ConversationOutboundResume);
    }

    private function latestKnownContactInbox(): ?ContactInbox
    {
        return $this->inbox->contactInboxes()
            ->where('contact_id', $this->contact->id)
            ->latest('id')
            ->first();
    }

    private function generateSourceId(): ?string
    {
        $channel = $this->inbox->channel;

        if (! $channel instanceof AddressesContacts) {
            throw new RuntimeException("Unsupported operation for this channel: {$this->inbox->channel_type}");
        }

        $sourceId = $channel->contactSourceId($this->contact);

        if (filled($sourceId) && $channel instanceof ChecksContactAddress) {
            $channel->assertDeliverable($sourceId);
        }

        return $sourceId;
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
