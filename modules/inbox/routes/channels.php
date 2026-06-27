<?php

use Illuminate\Support\Facades\Broadcast;
use Modules\Identity\Models\User;

/**
 * Inbox broadcast channel authorization.
 *
 * Private channel: workspace.{workspaceId}.conversations
 * Auth: user phải có active membership trong workspace (membershipFor != null).
 * User từ workspace khác subscribe → denied (return false).
 */
Broadcast::channel('workspace.{workspaceId}.conversations', function (User $user, string $workspaceId): bool {
    return $user->membershipFor($workspaceId) !== null;
});
