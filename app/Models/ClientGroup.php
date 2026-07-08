<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToWorkspace;
use App\Models\Concerns\HasOptimisticLock;
use Database\Factories\ClientGroupFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * P06 — Client group (workspace-level category for clients).
 * Slug is unique per workspace (enforced in DB + validated in requests).
 */
class ClientGroup extends Model
{
    /** @use HasFactory<ClientGroupFactory> */
    use Auditable, BelongsToWorkspace, HasFactory, HasOptimisticLock, HasUuids, SoftDeletes;

    protected static function newFactory(): ClientGroupFactory
    {
        return ClientGroupFactory::new();
    }

    protected $fillable = [
        'name',
        'slug',
    ];

    /**
     * @return BelongsToMany<Client, $this>
     */
    public function clients(): BelongsToMany
    {
        return $this->belongsToMany(Client::class, 'client_group_client')
            ->withTimestamps();
    }
}
