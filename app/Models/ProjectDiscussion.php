<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToWorkspace;
use App\Models\Concerns\HasComments;
use App\Models\Concerns\HasOptimisticLock;
use Database\Factories\ProjectDiscussionFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * P08 — Discussion thread on a project.
 * Replies = comments (P03 HasComments, commentable = ProjectDiscussion, alias 'project_discussion').
 * Thread carries subject + show_to_customer; replies inherit portal visibility from thread.
 *
 * G3: morph alias 'project_discussion' is registered in MorphMapServiceProvider.
 */
class ProjectDiscussion extends Model
{
    /** @use HasFactory<ProjectDiscussionFactory> */
    use Auditable, BelongsToWorkspace, HasComments, HasFactory, HasOptimisticLock, HasUuids, SoftDeletes;

    protected $fillable = [
        'subject',
        'body',
        'show_to_customer',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'show_to_customer' => 'boolean',
            'lock_version' => 'integer',
        ];
    }

    /** @return BelongsTo<Project, $this> */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
