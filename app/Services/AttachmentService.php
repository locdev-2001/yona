<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Models\Attachment;

/**
 * Owns all attachment write operations. Workspace context via BelongsToWorkspace
 * auto-stamp (currentWorkspace()). File bytes stored on the default configured disk
 * (never hardcoded). Path namespaced per workspace to prevent cross-tenant enumeration.
 */
class AttachmentService
{
    /**
     * Upload a file and attach it to an entity. Sets server-controlled fields:
     * workspace_id (auto-stamp), user_id, attachment_key, path, mime, size.
     */
    public function store(
        Model $attachable,
        UploadedFile $file,
        bool $visibleToCustomer = false
    ): Attachment {
        $workspace = currentWorkspace();
        $disk = config('filesystems.default');
        $filename = Str::uuid().'.'.$file->extension();
        $directory = 'attachments/'.$workspace->id;

        $path = Storage::disk($disk)->putFileAs($directory, $file, $filename);

        $attachment = new Attachment;
        $attachment->workspace_id = $workspace->id;
        $attachment->user_id = auth()->id();
        $attachment->attachable_type = $attachable->getMorphClass();
        $attachment->attachable_id = $attachable->getKey();
        $attachment->original_name = $file->getClientOriginalName();
        $attachment->path = $path;
        $attachment->mime = $file->getMimeType();
        $attachment->size = $file->getSize();
        $attachment->visible_to_customer = $visibleToCustomer;
        $attachment->attachment_key = Str::random(40);
        $attachment->save();

        return $attachment;
    }

    /**
     * Record an external link as an attachment (no bytes stored).
     */
    public function storeExternal(
        Model $attachable,
        string $link,
        string $name,
        ?string $thumbnail = null
    ): Attachment {
        $workspace = currentWorkspace();

        $attachment = new Attachment;
        $attachment->workspace_id = $workspace->id;
        $attachment->user_id = auth()->id();
        $attachment->attachable_type = $attachable->getMorphClass();
        $attachment->attachable_id = $attachable->getKey();
        $attachment->original_name = $name;
        $attachment->external_link = $link;
        $attachment->thumbnail_path = $thumbnail;
        $attachment->visible_to_customer = false;
        $attachment->attachment_key = Str::random(40);
        $attachment->save();

        return $attachment;
    }

    /**
     * Delete file bytes from disk then soft-delete the record.
     * Orphan GC (cleanup after parent soft-delete) is out of scope (P03 skip).
     */
    public function delete(Attachment $attachment): void
    {
        if ($attachment->path) {
            Storage::disk(config('filesystems.default'))->delete($attachment->path);
        }

        $attachment->delete();
    }
}
