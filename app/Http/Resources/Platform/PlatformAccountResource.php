<?php

namespace App\Http\Resources\Platform;

use App\Models\Account;

// Port từ refs/chatwoot/app/views/platform/api/v1/models/_account.json.jbuilder.
final class PlatformAccountResource
{
    public static function toArray(Account $account): array
    {
        return [
            'id' => $account->id,
            'name' => $account->name,
            'locale' => $account->locale,
            'domain' => $account->domain,
            'support_email' => $account->support_email,
            'features' => (object) $account->enabledFeatures(),
            'custom_attributes' => (object) ($account->custom_attributes ?? []),
            'limits' => (object) ($account->limits ?? []),
            'status' => $account->status === Account::STATUS_SUSPENDED ? 'suspended' : 'active',
        ];
    }
}
