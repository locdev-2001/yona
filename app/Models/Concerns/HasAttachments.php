<?php

namespace App\Models\Concerns;

use App\Models\Attachment;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Expose the attachments polymorphic relation on any workspace entity.
 * Business logic (upload, delete, download) lives in AttachmentService — NEVER in this trait.
 *
 * @phpstan-require-extends Model
 */
trait HasAttachments
{
    /** @return MorphMany<Attachment, $this> */
    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable')->latest();
    }
}
