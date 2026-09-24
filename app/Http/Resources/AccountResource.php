<?php

namespace App\Http\Resources;

use App\Models\Account;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Port từ api/v1/models/_account.json.jbuilder.
 *
 * Bỏ: `cache_keys` (chưa port), khối billing/EE.
 * Khối `custom_attributes` chỉ hiện khi có dữ liệu, đúng bản gốc.
 */
class AccountResource extends JsonResource
{
    // Bốn khóa gói cước luôn có mặt (kể cả null) khi account có custom_attributes.
    private const SUBSCRIPTION_KEYS = [
        'plan_name',
        'subscribed_quantity',
        'subscription_status',
        'subscription_ends_on',
    ];

    // Các khóa còn lại chỉ hiện khi có giá trị.
    private const OPTIONAL_CUSTOM_ATTRIBUTE_KEYS = [
        'website',
        'industry',
        'company_size',
        'timezone',
        'logo',
        'referral_source',
        'onboarding_step',
        'marked_for_deletion_at',
        'marked_for_deletion_reason',
    ];

    public function toArray(Request $request): array
    {
        /** @var Account $account */
        $account = $this->resource;

        $payload = [
            'settings' => (object) ($account->settings ?? []),
            'created_at' => $account->created_at,
            'domain' => $account->domain,
            'features' => (object) $account->enabledFeatures(),
            'id' => $account->id,
            'locale' => $account->locale,
            'name' => $account->name,
            'support_email' => $account->support_email,
            'status' => $account->status,
        ];

        $stored = collect($account->custom_attributes ?? []);

        if ($stored->isNotEmpty()) {
            $payload['custom_attributes'] = [
                ...collect(self::SUBSCRIPTION_KEYS)->mapWithKeys(fn (string $key) => [$key => $stored->get($key)])->all(),
                ...$stored->only(self::OPTIONAL_CUSTOM_ATTRIBUTE_KEYS)->filter(fn ($value) => filled($value))->all(),
            ];
        }

        return $payload;
    }
}
