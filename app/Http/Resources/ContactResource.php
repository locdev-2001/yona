<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\SerializesAttributeMaps;
use App\Models\Contact;
use App\Models\ContactInbox;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/models/_contact.json.jbuilder (+ _contact_inbox + _inbox_slim).
// company_id chỉ emit khi bật feature companies (enterprise) — giữ đúng gate.
class ContactResource extends JsonResource
{
    use SerializesAttributeMaps;

    public function __construct(Contact $resource, private readonly bool $withContactInboxes = false)
    {
        parent::__construct($resource);
    }

    /** @param iterable<Contact> $contacts */
    public static function collectionFor(iterable $contacts, bool $withContactInboxes): array
    {
        return collect($contacts)
            ->map(fn (Contact $contact) => (new self($contact, $withContactInboxes))->toArray(request()))
            ->values()
            ->all();
    }

    public function toArray(Request $request): array
    {
        /** @var Contact $contact */
        $contact = $this->resource;

        return [
            'additional_attributes' => self::attributeMap($contact->additional_attributes),
            'availability_status' => $contact->availabilityStatus(),
            'email' => $contact->email,
            'id' => $contact->id,
            'name' => $contact->name,
            'phone_number' => $contact->phone_number,
            'blocked' => $contact->blocked,
            'identifier' => $contact->identifier,
            'identified' => $contact->isIdentified(),
            ...($contact->account->featureEnabled('companies') ? ['company_id' => $contact->company_id] : []),
            'thumbnail' => $contact->avatarUrl(),
            'custom_attributes' => self::attributeMap($contact->custom_attributes),
            ...($contact->last_activity_at !== null ? ['last_activity_at' => $contact->last_activity_at->getTimestamp()] : []),
            ...($contact->created_at !== null ? ['created_at' => $contact->created_at->getTimestamp()] : []),
            ...($this->withContactInboxes ? [
                'contact_inboxes' => $contact->contactInboxes
                    ->map(fn (ContactInbox $contactInbox) => self::contactInboxPayload($contactInbox))
                    ->values()
                    ->all(),
            ] : []),
        ];
    }

    // Contact#push_event_data (app/models/contact.rb).
    public static function pushEventData(Contact $contact): array
    {
        return [
            'additional_attributes' => self::attributeMap($contact->additional_attributes),
            'custom_attributes' => self::attributeMap($contact->custom_attributes),
            'email' => $contact->email,
            'id' => $contact->id,
            'identifier' => $contact->identifier,
            'identified' => $contact->isIdentified(),
            'name' => $contact->name,
            'phone_number' => $contact->phone_number,
            'thumbnail' => $contact->avatarUrl(),
            'blocked' => $contact->blocked,
            'type' => 'contact',
            ...($contact->account->featureEnabled('companies') ? ['company_id' => $contact->company_id] : []),
        ];
    }

    // _contact_inbox.json.jbuilder: source_id + inbox_slim.
    public static function contactInboxPayload(ContactInbox $contactInbox): array
    {
        $inbox = $contactInbox->inbox;

        return [
            'source_id' => $contactInbox->source_id,
            'inbox' => [
                'id' => $inbox->id,
                'avatar_url' => $inbox->avatarUrl(),
                'channel_id' => $inbox->channel_id,
                'name' => $inbox->name,
                'channel_type' => $inbox->channel_type,
                'provider' => $inbox->channel->provider ?? null,
            ],
        ];
    }

    // Contact#webhook_data.
    public static function webhookData(Contact $contact): array
    {
        return [
            'account' => $contact->account->webhookData(),
            'additional_attributes' => self::attributeMap($contact->additional_attributes),
            'avatar' => $contact->avatarUrl(),
            'custom_attributes' => self::attributeMap($contact->custom_attributes),
            'email' => $contact->email,
            'id' => $contact->id,
            'identifier' => $contact->identifier,
            'name' => $contact->name,
            'phone_number' => $contact->phone_number,
            'thumbnail' => $contact->avatarUrl(),
            'blocked' => $contact->blocked,
        ];
    }
}
