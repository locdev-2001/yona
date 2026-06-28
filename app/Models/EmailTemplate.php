<?php

namespace App\Models;

use Database\Factories\EmailTemplateFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Concerns\Auditable;
use App\Models\Concerns\HasOptimisticLock;
use App\Models\Concerns\BelongsToWorkspace;

/**
 * P06 — Email template catalog entry (C4).
 *
 * Configuration resource — no owner_id/team_id/HasCustomFields (workspace-level config).
 * slug + language uniquely identifies a template; admin edits content only (not slug/type/language).
 * Active=false silently skips sending without error.
 *
 * @property string $id
 * @property string $workspace_id
 * @property string $slug
 * @property string $type
 * @property string $name
 * @property string $subject
 * @property string $body
 * @property string $language
 * @property bool $plaintext
 * @property bool $active
 * @property int $sort_order
 */
class EmailTemplate extends Model
{
    /** @use HasFactory<EmailTemplateFactory> */
    use Auditable, BelongsToWorkspace, HasFactory, HasOptimisticLock, HasUuids, SoftDeletes;

    protected static function newFactory(): EmailTemplateFactory
    {
        return EmailTemplateFactory::new();
    }

    // UI grouping categories (mirrors Perfex template types for M1 scope).
    const TYPES = ['leads', 'clients', 'contacts', 'projects', 'tasks', 'staff'];

    // G1 — repo only has vi+en, NEVER ja.
    const LANGUAGES = ['vi', 'en'];

    // Admin can only edit content fields.
    // slug, type, language, workspace_id, created_by, updated_by are server-controlled.
    protected $fillable = [
        'name',
        'subject',
        'body',
        'plaintext',
        'active',
        'sort_order',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'plaintext' => 'boolean',
            'active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * Scope: find a template by slug + language (exact match).
     *
     * @param  Builder<EmailTemplate>  $query
     * @return Builder<EmailTemplate>
     */
    public function scopeForSlug(Builder $query, string $slug, string $language): Builder
    {
        return $query->where('slug', $slug)->where('language', $language);
    }

    /**
     * Map a template slug to its entity type for the merge-field palette.
     * Extend when new slugs are added to the catalog.
     */
    public function slugEntityType(): string
    {
        return match (true) {
            str_starts_with($this->slug, 'lead_') => 'lead',
            str_starts_with($this->slug, 'client_') => 'client',
            str_starts_with($this->slug, 'contact_') => 'contact',
            str_starts_with($this->slug, 'project_') => 'project',
            str_starts_with($this->slug, 'task_') => 'task',
            default => 'lead',
        };
    }
}
