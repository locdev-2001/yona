<?php

namespace App\Models;

use App\Enums\AnnouncementCategory;
use App\Enums\AnnouncementStatus;
use App\Models\Concerns\Auditable;
use Database\Factories\AnnouncementFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * GLOBAL — no BelongsToWorkspace, no RLS, no workspace_id.
 * Platform-wide announcements authored by admin-plane users and visible to all
 * (or future-targeted) tenant users regardless of workspace context.
 *
 * server-controlled fields (excluded from $fillable):
 *   created_by, updated_by — set by AnnouncementService from auth('admin')
 *   status, published_at  — set explicitly via publish/unpublish actions
 *
 * @property string $id
 * @property string $title
 * @property string $slug
 * @property string $body
 * @property string|null $body_html
 * @property AnnouncementCategory|null $category
 * @property AnnouncementStatus $status
 * @property array<string, mixed>|null $audience
 * @property string|null $cover_image
 * @property int|null $created_by
 * @property int|null $updated_by
 * @property Carbon|null $published_at
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon|null $deleted_at
 */
class Announcement extends Model
{
    /** @use HasFactory<AnnouncementFactory> */
    use Auditable, HasFactory, HasUuids, SoftDeletes;

    /** Point factory resolver to the app-level factory (Database\Factories namespace). */
    protected static function newFactory(): Factory
    {
        return AnnouncementFactory::new();
    }

    /**
     * Mass-assignable fields. Server-controlled fields (created_by, updated_by,
     * status, published_at) are intentionally excluded (BR-X12).
     *
     * @var list<string>
     */
    protected $fillable = [
        'title',
        'slug',
        'body',
        'body_html',
        'category',
        'audience',
        'cover_image',
    ];

    protected function casts(): array
    {
        return [
            'category' => AnnouncementCategory::class,
            'status' => AnnouncementStatus::class,
            'audience' => 'array',
            'published_at' => 'datetime',
        ];
    }

    /** @return HasMany<AnnouncementRead, $this> */
    public function reads(): HasMany
    {
        return $this->hasMany(AnnouncementRead::class);
    }

    /**
     * Scope: published announcements whose publish date is in the past/now.
     *
     * @param  Builder<self>  $query
     * @return Builder<self>
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query
            ->where('status', AnnouncementStatus::Published)
            ->where('published_at', '<=', now());
    }
}
