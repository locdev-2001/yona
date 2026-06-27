<?php

namespace Modules\Announcements\Support;

use App\Models\Workspace;

/**
 * Determines whether a workspace (or a workspace-less context) can view an
 * announcement based on its audience jsonb payload.
 *
 * v1 only implements type=all.  The switch structure is intentionally
 * extensible for Plan / Entitlement / WorkspaceFilter targeting in future
 * iterations without touching callers.
 */
final class AudienceResolver
{
    /**
     * Return true if the given workspace context satisfies the audience rule.
     *
     * @param  array<string, mixed>  $audience  Decoded audience jsonb (e.g. ['type' => 'all'])
     */
    public static function canView(array $audience, ?Workspace $workspace = null): bool
    {
        return ($audience['type'] ?? null) === 'all';
    }
}
