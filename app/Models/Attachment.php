<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToWorkspace;
use App\Models\Concerns\HasOptimisticLock;
use Database\Factories\AttachmentFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Polymorphic file attachment. Download secured via attachment_key (non-enumeration).
 * Portal visibility gated by visible_to_customer (portal M2).
 * PII in original_name is referenced (not copied) in audit.
 *
 * @use HasFactory<AttachmentFactory>
 */
class Attachment extends Model
{
    /** @use HasFactory<AttachmentFactory> */
    use Auditable, BelongsToWorkspace, HasFactory, HasOptimisticLock, HasUuids, SoftDeletes;

    // User-editable only: workspace_id / user_id / contact_id / path / attachment_key /
    // mime / size / created_by / updated_by / lock_version are server-controlled (BR-X12).
    protected $fillable = [
        'original_name',
        'external_link',
        'thumbnail_path',
        'visible_to_customer',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'visible_to_customer' => 'boolean',
            'size' => 'integer',
        ];
    }

    /** PII field — audit stores reference, not raw value. */
    public function auditPiiAttributes(): array
    {
        return ['original_name'];
    }

    /** @return MorphTo<Model, $this> */
    public function attachable(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<User, $this> */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    protected static function newFactory(): AttachmentFactory
    {
        return AttachmentFactory::new();
    }
}
