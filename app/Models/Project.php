<?php

namespace App\Models;

use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Concerns\Auditable;
use App\Models\Team;
use App\Models\User;
use App\Models\Concerns\HasActivities;
use App\Models\Concerns\HasAttachments;
use App\Models\Concerns\HasCustomFields;
use App\Models\Concerns\HasNotes;
use App\Models\Concerns\HasOptimisticLock;
use App\Models\Client;
use App\Models\Concerns\BelongsToWorkspace;

/**
 * P08 — Project entity. Hosts: custom fields, attachments, activities, notes.
 *
 * billing_type is persisted but not used for billing logic (M3).
 * progress can be manual or auto-computed from tasks (P09 stub-safe via Schema::hasTable guard).
 * project_number / status_id / owner_id / team_id are server-controlled via ProjectService.
 *
 * G6: implements customFieldEntityType() — MANDATORY for HasCustomFields.
 * G12: member add/remove validated in ProjectService (active WorkspaceMember assert).
 */
class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use Auditable, BelongsToWorkspace, HasActivities, HasAttachments, HasCustomFields, HasFactory, HasNotes, HasOptimisticLock, HasUuids, SoftDeletes;

    protected static function newFactory(): ProjectFactory
    {
        return ProjectFactory::new();
    }

    // Billing type constants (M3 Finance will consume these)
    const BILLING_FIXED = 1;

    const BILLING_HOURLY = 2;

    const BILLING_NON_BILLABLE = 3;

    const BILLING_TYPES = [
        self::BILLING_FIXED => 'fixed',
        self::BILLING_HOURLY => 'hourly',
        self::BILLING_NON_BILLABLE => 'non_billable',
    ];

    // User inputs only — server-controlled fields (project_number, status_id, owner_id,
    // team_id, is_pinned, finished_at, custom_fields, workspace_id, created_by, updated_by,
    // lock_version) are set via ProjectService, NOT mass-assigned from requests.
    protected $fillable = [
        'name',
        'description',
        'client_id',
        'billing_type',
        'start_date',
        'deadline',
        'progress',
        'progress_from_tasks',
        'visible_to_customer',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'deadline' => 'date',
            'finished_at' => 'datetime',
            'progress_from_tasks' => 'boolean',
            'is_pinned' => 'boolean',
            'visible_to_customer' => 'boolean',
            'custom_fields' => 'array',
            'billing_type' => 'integer',
            'progress' => 'integer',
            'lock_version' => 'integer',
        ];
    }

    // G6 — MANDATORY: return the entity type alias matching morph map and CustomFieldDefinition::ENTITY_TYPES.
    public function customFieldEntityType(): string
    {
        return 'project';
    }

    public function activitySubjectName(): string
    {
        return $this->name.' #'.$this->project_number;
    }

    /** @return BelongsTo<Client, $this> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /** @return BelongsTo<ProjectStatus, $this> */
    public function status(): BelongsTo
    {
        return $this->belongsTo(ProjectStatus::class, 'status_id');
    }

    /** @return BelongsTo<User, $this> */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /** @return BelongsTo<Team, $this> */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /** @return BelongsToMany<User, $this> */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_members', 'project_id', 'user_id')
            ->withPivot(['id', 'workspace_id', 'created_at']);
    }

    /** @return HasMany<ProjectMilestone, $this> */
    public function milestones(): HasMany
    {
        return $this->hasMany(ProjectMilestone::class)->orderBy('milestone_order');
    }

    /** @return HasMany<ProjectDiscussion, $this> */
    public function discussions(): HasMany
    {
        return $this->hasMany(ProjectDiscussion::class)->latest();
    }
}
