<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

/**
 * Inbox broadcast channel authorization (moved from modules/inbox).
 *
 * Private channel: workspace.{workspaceId}.conversations
 * Auth: user phải có active membership trong workspace (membershipFor != null).
 */
Broadcast::channel('workspace.{workspaceId}.conversations', function (User $user, string $workspaceId): bool {
    return $user->membershipFor($workspaceId) !== null;
});
