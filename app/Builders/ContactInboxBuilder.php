<?php

namespace App\Builders;

use App\Channels\AddressesContacts;
use App\Channels\Capability;
use App\Channels\ChecksContactAddress;
use App\Channels\MatchesContactAddressCaseInsensitively;
use App\Channels\UndeliverableContactAddress;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Inbox;
use RuntimeException;

/**
 * source_id không truyền vào thì kênh tự suy từ hồ sơ liên hệ (AddressesContacts); kênh
 * không suy được nhưng khai mở lại hội thoại thì dùng địa chỉ khách đã có ở hộp thư đó.
 * `outbound` = người trực chủ động mở hội thoại: địa chỉ truyền vào cũng phải qua kiểm của
 * kênh (ChecksContactAddress), như địa chỉ kênh tự suy.
 */
class ContactInboxBuilder
{
    public function __construct(
        private readonly Contact $contact,
        private readonly Inbox $inbox,
        private ?string $sourceId = null,
        private readonly bool $hmacVerified = false,
        private readonly bool $outbound = false,
    ) {}

    /** @throws UndeliverableContactAddress */
    public function perform(): ?ContactInbox
    {
        if ($this->sourceId === null && $this->resumesKnownAddress()) {
            return $this->latestKnownContactInbox();
        }

        $this->assertDeliverable();
        $this->sourceId ??= $this->derivedSourceId();

        if (blank($this->sourceId)) {
            return null;
        }

        return $this->existingContactInboxIgnoringCase() ?? $this->createContactInbox();
    }

    /**
     * Kiểm địa chỉ sẽ dùng mà không ghi gì, để gọi trước transaction (kiểm có thể tra mạng);
     * liên hệ chưa lưu cũng được. Kết quả kiểm được kênh nhớ nên perform() sau đó không tra lại.
     *
     * @throws UndeliverableContactAddress
     */
    public function assertDeliverable(): void
    {
        $channel = $this->inbox->channel;

        if (! $channel instanceof ChecksContactAddress || ($this->sourceId !== null && ! $this->outbound)) {
            return;
        }

        if ($this->sourceId === null && $this->resumesKnownAddress()) {
            return;
        }

        $sourceId = $this->sourceId ?? $this->derivedSourceId();

        if (filled($sourceId)) {
            $channel->assertDeliverable($sourceId);
        }
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

    private function derivedSourceId(): ?string
    {
        $channel = $this->inbox->channel;

        if (! $channel instanceof AddressesContacts) {
            throw new RuntimeException("Unsupported operation for this channel: {$this->inbox->channel_type}");
        }

        return $channel->contactSourceId($this->contact);
    }

    private function existingContactInboxIgnoringCase(): ?ContactInbox
    {
        if (! $this->inbox->channel instanceof MatchesContactAddressCaseInsensitively || $this->contact->id === null) {
            return null;
        }

        return $this->inbox->contactInboxes()
            ->where('contact_id', $this->contact->id)
            ->whereRaw('LOWER(source_id) = ?', [mb_strtolower((string) $this->sourceId)])
            ->latest('id')
            ->first();
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
