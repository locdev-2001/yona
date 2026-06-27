<?php

namespace Modules\Email\Policies;

use Modules\Email\Models\EmailTemplate;
use Modules\Identity\Models\User;

/**
 * P06 — Authorization for email template management.
 *
 * No create/delete at M1 (slugs are seeded catalog, not user-created).
 * Non-enumeration (BR-X15): missing template is 404 via RLS route-model-binding.
 */
class EmailTemplatePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('tenant.email_template.view');
    }

    public function view(User $user, EmailTemplate $template): bool
    {
        return $user->can('tenant.email_template.view');
    }

    public function update(User $user, EmailTemplate $template): bool
    {
        return $user->can('tenant.email_template.manage');
    }

    public function sendTest(User $user, EmailTemplate $template): bool
    {
        return $user->can('tenant.email_template.manage');
    }
}
