<?php

namespace Modules\CrmSales\Models;

use Database\Factories\ClientFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Identity\Models\Concerns\Auditable;
use Modules\Identity\Models\User;
use Modules\Shared\Concerns\HasActivities;
use Modules\Shared\Concerns\HasAttachments;
use Modules\Shared\Concerns\HasCustomFields;
use Modules\Shared\Concerns\HasNotes;
use Modules\Shared\Concerns\HasOptimisticLock;
use Modules\Shared\Concerns\HasTags;
use Modules\Tenancy\Concerns\BelongsToWorkspace;

/**
 * P06 — Client (company entity). Hosts: custom fields, tags, attachments,
 * notes, activity timeline. Many contacts; exactly 1 primary contact.
 * Visibility controlled by owner_id, customer-admin pivot, and RBAC (G2).
 *
 * @property string $id
 * @property string $workspace_id
 * @property int|null $owner_id
 * @property string|null $team_id
 * @property string $name
 * @property string|null $vat
 * @property string|null $phone
 * @property string|null $website
 * @property string|null $currency
 * @property string|null $default_language
 * @property string|null $billing_street
 * @property string|null $billing_city
 * @property string|null $billing_state
 * @property string|null $billing_zip
 * @property string|null $billing_country
 * @property string|null $shipping_street
 * @property string|null $shipping_city
 * @property string|null $shipping_state
 * @property string|null $shipping_zip
 * @property string|null $shipping_country
 * @property string|null $leadid
 * @property array<string, mixed> $custom_fields
 */
class Client extends Model
{
    /** @use HasFactory<ClientFactory> */
    use Auditable, BelongsToWorkspace, HasActivities, HasAttachments, HasCustomFields, HasFactory, HasNotes, HasOptimisticLock, HasTags, HasUuids, SoftDeletes;

    protected static function newFactory(): ClientFactory
    {
        return ClientFactory::new();
    }

    const VAULT_VISIBILITY = ['private', 'shared'];

    // workspace_id / owner_id / team_id / leadid / custom_fields are server-controlled
    protected $fillable = [
        'name',
        'vat',
        'phone',
        'website',
        'currency',
        'default_language',
        'billing_street',
        'billing_city',
        'billing_state',
        'billing_zip',
        'billing_country',
        'shipping_street',
        'shipping_city',
        'shipping_state',
        'shipping_zip',
        'shipping_country',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'custom_fields' => 'array',
        ];
    }

    // ─── Custom-field contract (G6) ────────────────────────────────────────────

    public function customFieldEntityType(): string
    {
        return 'client';
    }

    // ─── Activity ──────────────────────────────────────────────────────────────

    public function activitySubjectName(): string
    {
        return $this->name;
    }

    // ─── Relations ─────────────────────────────────────────────────────────────

    /** @return HasMany<Contact, $this> */
    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    /** @return HasOne<Contact, $this> */
    public function primaryContact(): HasOne
    {
        return $this->hasOne(Contact::class)->where('is_primary', true);
    }

    /**
     * Client groups (many-to-many, pivot carries workspace_id for RLS G4).
     * Uses ClientGroupPivot (HasUuids) so sync/attach auto-generates the uuid PK.
     * select() qualifies columns to avoid ambiguous `id` when both tables have uuid PK.
     *
     * @return BelongsToMany<ClientGroup, $this, ClientGroupPivot>
     */
    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(
            ClientGroup::class,
            'client_group_client',
            'client_id',
            'client_group_id',
        )
            ->using(ClientGroupPivot::class)
            ->withTimestamps()
            ->select('client_groups.*');
    }

    /**
     * Customer-admin users delegated full access to this client (B1, G12).
     * Pivot carries workspace_id for RLS (G4).
     * Uses ClientUserPivot (HasUuids) so sync/attach auto-generates the uuid PK.
     *
     * @return BelongsToMany<User, $this, ClientUserPivot>
     */
    public function customerAdmins(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'client_user')
            ->using(ClientUserPivot::class)
            ->withTimestamps();
    }

    /** @return BelongsTo<User, $this> */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /** @return HasMany<ClientVaultEntry, $this> */
    public function vaultEntries(): HasMany
    {
        return $this->hasMany(ClientVaultEntry::class);
    }
}
