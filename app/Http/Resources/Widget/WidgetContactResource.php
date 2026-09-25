<?php

namespace App\Http\Resources\Widget;

use App\Models\Contact;

// Port từ api/v1/widget/contacts/{show,update,set_user}.json.jbuilder — widget
// chỉ được biết "có hay không" từng định danh, không nhận giá trị thật.
final class WidgetContactResource
{
    /** @return array<string, mixed> */
    public static function identityFlags(Contact $contact): array
    {
        return [
            'id' => $contact->id,
            'has_email' => filled($contact->email),
            'has_name' => filled($contact->name),
            'has_phone_number' => filled($contact->phone_number),
        ];
    }

    /** @return array<string, mixed> */
    public static function show(Contact $contact, ?string $pubsubToken): array
    {
        return [...self::identityFlags($contact), 'identifier' => $contact->identifier, 'pubsub_token' => $pubsubToken];
    }

    /** @return array<string, mixed> */
    public static function setUser(Contact $contact, ?string $widgetAuthToken): array
    {
        return [
            ...self::identityFlags($contact),
            ...($widgetAuthToken === null ? [] : ['widget_auth_token' => $widgetAuthToken]),
        ];
    }
}
