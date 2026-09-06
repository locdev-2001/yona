<?php

namespace App\Http\Resources\Search;

use App\Http\Resources\Concerns\SerializesAttributeMaps;
use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/accounts/search/_contact.json.jbuilder — hẹp hơn
// _contact.json.jbuilder dùng chung (không thumbnail/custom_attributes/created_at).
class SearchContactResource extends JsonResource
{
    use SerializesAttributeMaps;

    /** @param iterable<Contact> $contacts */
    public static function collectionFor(iterable $contacts): array
    {
        return collect($contacts)
            ->map(fn (Contact $contact) => (new self($contact))->toArray(request()))
            ->values()
            ->all();
    }

    public function toArray(Request $request): array
    {
        /** @var Contact $contact */
        $contact = $this->resource;

        return [
            'email' => $contact->email,
            'id' => $contact->id,
            'name' => $contact->name,
            'phone_number' => $contact->phone_number,
            'identifier' => $contact->identifier,
            'additional_attributes' => self::attributeMap($contact->additional_attributes),
            'last_activity_at' => $contact->last_activity_at?->getTimestamp(),
        ];
    }
}
