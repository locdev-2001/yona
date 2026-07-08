<?php

namespace App\Models;

use App\Models\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * WorkspacePurchase — tenant mua gói (RLS, workspace-scoped).
 *
 * status: active | cancelled | expired
 * lock_version: optimistic locking cho admin grant/cancel (tránh concurrent update).
 * external_ref: payment ref cho VNPay/MoMo (GĐ2+), nullable GĐ1.
 */
class WorkspacePurchase extends Model
{
    use BelongsToWorkspace, HasUuids;

    protected $fillable = [
        'workspace_id',
        'item_id',
        'status',
        'quantity',
        'external_ref',
        'current_period_start',
        'current_period_end',
        'lock_version',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'lock_version' => 'integer',
            'current_period_start' => 'datetime',
            'current_period_end' => 'datetime',
        ];
    }

    /** @return BelongsTo<MarketplaceItem, $this> */
    public function item(): BelongsTo
    {
        return $this->belongsTo(MarketplaceItem::class, 'item_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
