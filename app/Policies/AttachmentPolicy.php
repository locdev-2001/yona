<?php

namespace App\Policies;

use App\Models\Attachment;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Attachment authorization. create delegates to the parent entity's policy
 * (caller must pre-resolve parent). view/delete = uploader or admin.
 * Visibility fail → abort(404) (non-enumeration, BR-X15).
 */
class AttachmentPolicy
{
    /**
     * Creating an attachment requires EDIT rights on the parent entity.
     *
     * Caller: $user->can('create', [Attachment::class, $parent]) — Gate uses the
     * first array element to resolve THIS policy and SPREADS the array as method
     * args, so $parent arrives here as the 2nd argument (the class string is
     * dropped by Gate before dispatch). We delegate to the parent's `update`
     * ability: a member who cannot edit a Client/Lead/Project/Task/Contact
     * cannot attach files to it (within-workspace authz — RLS blocks cross-ws).
     */
    public function create(User $user, ?Model $parent = null): bool
    {
        return $parent !== null && $user->can('update', $parent);
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
