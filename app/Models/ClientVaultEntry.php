<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToWorkspace;
use App\Models\Concerns\HasOptimisticLock;
use Database\Factories\ClientVaultEntryFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * P06 (should) — Vault entry for a client: stores encrypted credentials.
 * password is cast as 'encrypted' (Laravel Crypt) — DB stores ciphertext.
 * visibility: 'private' = only owner; 'shared' = all with client access.
 */
class ClientVaultEntry extends Model
{
    /** @use HasFactory<ClientVaultEntryFactory> */
    use Auditable, BelongsToWorkspace, HasFactory, HasOptimisticLock, HasUuids, SoftDeletes;

    const VISIBILITY_PRIVATE = 'private';

    const VISIBILITY_SHARED = 'shared';

    protected $fillable = [
        'name',
        'server_address',
        'port',
        'username',
        'password',
        'description',
        'share_in_projects',
        'visibility',
    ];

    // Vault is write-only from the client: the decrypted password must never be
    // serialized into Inertia/API responses. (Without this, eager-loading vault
    // entries on the client detail page would leak every stored password.)
    protected $hidden = ['password'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'password' => 'encrypted', // Crypt::encrypt/decrypt at rest (G spec should)
            'share_in_projects' => 'boolean',
        ];
    }

    /** @return BelongsTo<Client, $this> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
