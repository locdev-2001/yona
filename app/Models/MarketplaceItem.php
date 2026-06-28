<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * MarketplaceItem — catalog gói cước / add-on (GLOBAL, không RLS, không workspace).
 *
 * Không dùng BelongsToWorkspace — đây là dữ liệu platform-wide.
 * entitlements jsonb: {flags: ["module.inbox", ...], quotas: {"quota.conversations.zalo_personal": 50}}
 */
class MarketplaceItem extends Model
{
    use HasUuids;

    protected $fillable = [
        'code',
        'name',
        'type',
        'billing_type',
        'price_cents',
        'currency',
        'entitlements',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'entitlements' => 'array',
            'is_active' => 'boolean',
            'price_cents' => 'integer',
        ];
    }

    /** @return HasMany<WorkspacePurchase, $this> */
    public function purchases(): HasMany
    {
        return $this->hasMany(WorkspacePurchase::class, 'item_id');
    }

    public function getFlags(): array
    {
        return $this->entitlements['flags'] ?? [];
    }

    public function getQuotas(): array
    {
        return $this->entitlements['quotas'] ?? [];
    }
}
