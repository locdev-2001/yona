<?php

namespace Modules\CrmSales\Models;

use Database\Factories\LeadFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Modules\Identity\Models\Concerns\Auditable;
use Modules\Identity\Models\User;
use Modules\Shared\Concerns\HasActivities;
use Modules\Shared\Concerns\HasAttachments;
use Modules\Shared\Concerns\HasCustomFields;
use Modules\Shared\Concerns\HasNotes;
use Modules\Shared\Concerns\HasOptimisticLock;
use Modules\Shared\Concerns\HasReminders;
use Modules\Shared\Concerns\HasTags;
use Modules\Tenancy\Concerns\BelongsToWorkspace;
use Modules\Tenancy\Models\WorkspaceMember;

/**
 * P07 — Lead entity. Workspace-scoped, pipeline+stage required.
 * Trait stack: HasCustomFields, HasTags, HasAttachments, HasNotes, HasActivities,
 * HasReminders (G12 trait checklist). morph alias 'lead' (G3, P03 map).
 *
 * Visibility rule (G12): own (assigned_to/owner_id/created_by=me) OR team OR
 * is_public=true OR tenant.lead.view (all). Fail → abort(404) non-enumeration.
 *
 * @property string $id
 * @property string $workspace_id
 * @property int|null $owner_id
 * @property string|null $team_id
 * @property int $lead_number
 * @property string $name
 * @property string|null $title
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $company
 * @property float|null $lead_value
 * @property string|null $address
 * @property string|null $city
 * @property string|null $state
 * @property string|null $zip
 * @property string|null $country
 * @property string|null $website
 * @property string|null $description
 * @property string $pipeline_id
 * @property string $stage_id
 * @property string|null $source_id
 * @property int|null $assigned_to
 * @property Carbon|null $last_contact
 * @property Carbon|null $date_converted
 * @property string|null $converted_client_id
 * @property bool $is_junk
 * @property bool $is_lost
 * @property bool $is_public
 * @property int $lead_order
 * @property string|null $last_stage_id
 * @property string|null $conversation_id  P07: inbox conversation ref (no FK, cross-module N1)
 * @property string|null $contact_id       P07: CDP contact ref (no FK, cross-module N1)
 * @property array<string, mixed> $custom_fields
 * @property int $lock_version
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon|null $deleted_at
 */
class Lead extends Model
{
    /** @use HasFactory<LeadFactory> */
    use Auditable, BelongsToWorkspace, HasActivities, HasAttachments, HasCustomFields,
        HasFactory, HasNotes, HasOptimisticLock, HasReminders, HasTags, HasUuids, SoftDeletes;

    protected static function newFactory(): LeadFactory
    {
        return LeadFactory::new();
    }

    const NUMBER_PREFIX = 'LEAD';

    /**
     * User-supplied fields only.
     * System columns: workspace_id, owner_id, team_id, created_by, updated_by,
     * lock_version, lead_number, lead_order, last_contact, date_converted,
     * converted_client_id, is_lost, is_junk, last_stage_id.
     * P07 inbox refs: conversation_id, contact_id (set by ConversationLeadController, no FK cross-module).
     */
    protected $fillable = [
        'name',
        'title',
        'email',
        'phone',
        'company',
        'lead_value',
        'address',
        'city',
        'state',
        'zip',
        'country',
        'website',
        'description',
        'pipeline_id',
        'stage_id',
        'source_id',
        'assigned_to',
        'is_public',
        // P07 — inbox cross-module refs (set by ConversationLeadController only, no FK)
        'conversation_id',
        'contact_id',
    ];

    /** @return array<string, string|array<string>> */
    protected function casts(): array
    {
        return [
            'lead_value' => 'decimal:2',
            'is_junk' => 'boolean',
            'is_lost' => 'boolean',
            'is_public' => 'boolean',
            'last_contact' => 'datetime',
            'date_converted' => 'datetime',
            'custom_fields' => 'array',
            'lead_order' => 'integer',
            'lead_number' => 'integer',
            'lock_version' => 'integer',
        ];
    }

    // ─── Custom-field contract (G6) ────────────────────────────────────────────

    public function customFieldEntityType(): string
    {
        return 'lead';
    }

    // ─── Activity helper ───────────────────────────────────────────────────────

    public function activitySubjectName(): string
    {
        return $this->name;
    }

    // ─── Visibility scope (G12) ────────────────────────────────────────────────

    /**
     * Filter to leads visible to $user:
     *   tenant.lead.view  → no extra filter (sees all in workspace)
     *   otherwise         → assigned_to=me OR owner_id=me OR created_by=me
     *                       OR team_id ∈ user's teams OR is_public=true
     */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if ($user->can('tenant.lead.view')) {
            return $query;
        }

        $userId = $user->id;
        $workspaceId = currentWorkspace()->id;

        // Resolve team IDs the user belongs to (via workspace_member.team_id).
        // Avoids Spatie team config which is not enabled in this project.
        $teamIds = WorkspaceMember::where('workspace_id', $workspaceId)
            ->where('user_id', $userId)
            ->whereNotNull('team_id')
            ->pluck('team_id')
            ->toArray();

        return $query->where(function (Builder $q) use ($userId, $teamIds) {
            $q->where('assigned_to', $userId)
                ->orWhere('owner_id', $userId)
                ->orWhere('created_by', $userId)
                ->orWhere('is_public', true);

            if (! empty($teamIds)) {
                $q->orWhereIn('team_id', $teamIds);
            }
        });
    }

    // ─── Relations ─────────────────────────────────────────────────────────────

    /** @return BelongsTo<Pipeline, $this> */
    public function pipeline(): BelongsTo
    {
        return $this->belongsTo(Pipeline::class);
    }

    /** @return BelongsTo<PipelineStage, $this> */
    public function stage(): BelongsTo
    {
        return $this->belongsTo(PipelineStage::class, 'stage_id');
    }

    /** @return BelongsTo<PipelineStage, $this> */
    public function lastStage(): BelongsTo
    {
        return $this->belongsTo(PipelineStage::class, 'last_stage_id');
    }

    /** @return BelongsTo<LeadSource, $this> */
    public function source(): BelongsTo
    {
        return $this->belongsTo(LeadSource::class, 'source_id');
    }

    /** @return BelongsTo<User, $this> */
    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /** @return BelongsTo<User, $this> */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /** @return BelongsTo<Client, $this> */
    public function convertedClient(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'converted_client_id');
    }
}
