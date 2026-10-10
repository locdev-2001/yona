<?php

namespace App\Services\Contacts;

use App\Channels\AddressesContacts;
use App\Channels\Capability;
use App\Channels\ChecksContactAddress;
use App\Channels\LimitsMessagingWindow;
use App\Channels\UndeliverableContactAddress;
use App\Models\Contact;
use App\Models\ContactInbox;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Support\PhoneNumber;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Hộp thư mà người trực mở được hội thoại mới tới một liên hệ, kèm địa chỉ của khách ở
 * từng hộp. Lõi chỉ hỏi năng lực và contract kênh: kênh tự suy địa chỉ
 * (conversation_outbound_start) hoặc nối lại địa chỉ khách đã có (conversation_outbound_resume),
 * cửa sổ nhắn tin (LimitsMessagingWindow), địa chỉ gửi tới được (ChecksContactAddress).
 */
class ContactableInboxes
{
    public const REASON_MESSAGING_WINDOW_CLOSED = 'messaging_window_closed';

    public const REASON_REAUTHORIZATION_REQUIRED = 'reauthorization_required';

    /**
     * @param  Builder<Inbox>  $visibleInboxes
     * @return list<array{inbox: Inbox, source_id: string, display_address: ?string, available: bool, reason: ?string}>
     */
    public function for(Contact $contact, Builder $visibleInboxes): array
    {
        $inboxes = $visibleInboxes->with('channel')->orderBy('id')->get();
        $knownContactInboxes = $this->latestContactInboxesByInbox($contact);
        $latestConversations = $this->latestConversationsByInbox($contact);

        $entries = [];

        foreach ($inboxes as $inbox) {
            $known = $knownContactInboxes->get($inbox->id);
            $sourceId = $this->sourceIdFor($inbox, $contact, $known);

            if ($sourceId === null) {
                continue;
            }

            $reason = $this->unavailableReason($inbox, $sourceId, $known);
            $entries[] = [
                'inbox' => $inbox,
                'source_id' => $sourceId,
                'display_address' => $this->displayAddress($contact, $sourceId),
                'available' => $reason === null,
                'reason' => $reason,
                'last_activity' => $latestConversations->get($inbox->id)?->last_activity_at?->getTimestamp() ?? 0,
            ];
        }

        usort($entries, static fn (array $a, array $b) => $b['last_activity'] <=> $a['last_activity']);

        return array_map(static function (array $entry) {
            unset($entry['last_activity']);

            return $entry;
        }, $entries);
    }

    private function sourceIdFor(Inbox $inbox, Contact $contact, ?ContactInbox $known): ?string
    {
        $channel = $inbox->channel;

        if ($inbox->supports(Capability::ConversationOutboundStart) && $channel instanceof AddressesContacts) {
            $derived = $channel->contactSourceId($contact);

            if (filled($derived)) {
                return $derived;
            }
        }

        if ($known !== null && $inbox->supports(Capability::ConversationOutboundResume)) {
            return (string) $known->source_id;
        }

        return null;
    }

    private function unavailableReason(Inbox $inbox, string $sourceId, ?ContactInbox $known): ?string
    {
        if ($inbox->reauthorizationRequired()) {
            return self::REASON_REAUTHORIZATION_REQUIRED;
        }

        $channel = $inbox->channel;

        if ($inbox->supports(Capability::MessagingWindow) && $channel instanceof LimitsMessagingWindow
            && ($known === null || ! $channel->messagingWindowOpen($known))) {
            return self::REASON_MESSAGING_WINDOW_CLOSED;
        }

        if ($channel instanceof ChecksContactAddress) {
            try {
                $channel->assertDeliverable($sourceId);
            } catch (UndeliverableContactAddress $exception) {
                return $exception->reason;
            }
        }

        return null;
    }

    /** Địa chỉ người dùng nhận ra được: chỉ khi source_id chính là email hay số điện thoại trong hồ sơ. */
    private function displayAddress(Contact $contact, string $sourceId): ?string
    {
        if (filled($contact->email) && strcasecmp($sourceId, (string) $contact->email) === 0) {
            return $sourceId;
        }

        $phone = PhoneNumber::normalize($contact->phone_number);

        return $phone !== null && PhoneNumber::normalize($sourceId, acceptBareNationalNumber: false) === $phone
            ? $sourceId
            : null;
    }

    /** @return Collection<int, ContactInbox> inbox_id => contact_inbox mới nhất */
    private function latestContactInboxesByInbox(Contact $contact): Collection
    {
        return $contact->contactInboxes()->orderBy('id')->get()->keyBy('inbox_id');
    }

    /** @return Collection<int, Conversation> inbox_id => hội thoại hoạt động gần nhất */
    private function latestConversationsByInbox(Contact $contact): Collection
    {
        return $contact->conversations()
            ->selectRaw('DISTINCT ON (conversations.inbox_id) conversations.*')
            ->with('inbox.channel')
            ->orderBy('conversations.inbox_id')
            ->orderByRaw('conversations.last_activity_at DESC NULLS LAST')
            ->orderByDesc('conversations.id')
            ->get()
            ->keyBy('inbox_id');
    }
}
