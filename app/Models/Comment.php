<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Modules\Tenancy\Concerns\BelongsToWorkspace;
use App\Models\Concerns\HasOptimisticLock;
use Database\Factories\CommentFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Polymorphic comment with 1-level thread support (parent_id).
 * Portal visibility controlled by visible_to_customer — staff see all,
 * contacts only see visible_to_customer=true (CommentService::visibleFor / G3).
 * body may contain PII — referenced in audit.
 *
 * @use HasFactory<CommentFactory>
 */
class Comment extends Model
{
    /** @use HasFactory<CommentFactory> */
    use Auditable, BelongsToWorkspace, HasFactory, HasOptimisticLock, HasUuids, SoftDeletes;

    // user_id / contact_id / parent_id / workspace_id / created_by / updated_by are server-controlled.
    protected $fillable = [
        'body',
        'visible_to_customer',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'visible_to_customer' => 'boolean',
        ];
    }

    /** body may contain PII — audit stores reference. */
    public function auditPiiAttributes(): array
    {
        return ['body'];
    }

    /** @return MorphTo<Model, $this> */
    public function commentable(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<Comment, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Comment::class, 'parent_id');
    }

    /** @return HasMany<Comment, $this> */
    public function replies(): HasMany
    {
        return $this->hasMany(Comment::class, 'parent_id')->latest();
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
