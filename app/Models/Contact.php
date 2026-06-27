<?php

namespace App\Models;

use Database\Factories\ContactFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Identity\Models\Concerns\Auditable;
use Modules\Shared\Concerns\HasCustomFields;
use Modules\Shared\Concerns\HasOptimisticLock;
use Modules\Tenancy\Concerns\BelongsToWorkspace;

/**
 * P06 — Contact (person, belongs to one client; many per client; 1 primary).
 * G12 — portal cols (password, email_verified_at, is_active, email_optin) are
 * created for M2 but NEVER exposed via Inertia resources or FormRequests here.
 * G10 — email partial unique index enforced in DB migration (not Blueprint).
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $client_id
 * @property string $first_name
 * @property string|null $last_name
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $title
 * @property bool $is_primary
 * @property string|null $language
 * @property array<string, mixed> $custom_fields
 */
class Contact extends Model
{
    /** @use HasFactory<ContactFactory> */
    use Auditable, BelongsToWorkspace, HasCustomFields, HasFactory, HasOptimisticLock, HasUuids, SoftDeletes;

    // is_primary / client_id / workspace_id / portal cols are server-controlled (G12)
    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'title',
        'language',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_primary' => 'boolean',
            'is_active' => 'boolean',
            'email_optin' => 'array',
            'custom_fields' => 'array',
            'email_verified_at' => 'datetime',
            'password' => 'hashed', // ready for M2 portal auth
        ];
    }

    // ─── Custom-field contract (G6) ────────────────────────────────────────────

    public function customFieldEntityType(): string
    {
        return 'contact';
    }

    // ─── Relations ─────────────────────────────────────────────────────────────

    /** @return BelongsTo<Client, $this> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    /** Full display name. */
    public function fullName(): string
    {
        return trim($this->first_name.' '.$this->last_name);
    }

    /**
     * Effective language: own language or fallback to client default (G12).
     */
    public function effectiveLanguage(): ?string
    {
        return $this->language ?: $this->client?->default_language;
    }
}
