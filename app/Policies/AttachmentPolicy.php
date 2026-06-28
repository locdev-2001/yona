<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Attachment;

/**
 * Attachment authorization. create delegates to the parent entity's policy
 * (caller must pre-resolve parent). view/delete = uploader or admin.
 * Visibility fail → abort(404) (non-enumeration, BR-X15).
 */
class AttachmentPolicy
{
    /**
     * Creating an attachment requires the user to be able to manage the workspace.
     * The caller (FormRequest / Controller) resolves the parent entity and checks
     * edit rights on it. Here we allow any authenticated workspace member.
     *
     * @param  array<int, mixed>|null  $args  [Attachment::class, $parentModel]
     */
    public function create(User $user, ?array $args = null): bool
    {
        // Delegate: authenticated workspace member can attach files.
        // Fine-grained entity-level gate is in StoreAttachmentRequest::authorize().
        return true;
    }

    /**
     * View (includes download): uploader or admin.
     * Contact portal caller checks visible_to_customer separately in controller.
     */
    public function view(User $user, Attachment $attachment): bool
    {
        return $user->id === $attachment->user_id
            || $user->can('tenant.attachment.manage');
    }

    public function delete(User $user, Attachment $attachment): bool
    {
        return $user->id === $attachment->user_id
            || $user->can('tenant.attachment.manage');
    }
}
