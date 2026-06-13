<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Platform-plane role assignment (super_admin | support_engineer | billing_ops).
 * Internal staff only; server-controlled (BR-X12).
 */
class PlatformRole extends Model
{
    use HasUuids;

    protected $table = 'platform_role_user';

    protected $guarded = ['*'];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
