<?php

use App\Models\Workspace;
use App\Models\WorkspaceMember;

if (! function_exists('currentWorkspace')) {
    /**
     * The active workspace for this request (bound by IdentifyWorkspace),
     * or null when no workspace context is established (auth pages, console).
     */
    function currentWorkspace(): ?Workspace
    {
        return app()->bound('currentWorkspace') ? app('currentWorkspace') : null;
    }
}

if (! function_exists('currentMembership')) {
    /**
     * The active user's membership in the current workspace, or null.
     */
    function currentMembership(): ?WorkspaceMember
    {
        return app()->bound('currentMembership') ? app('currentMembership') : null;
    }
}
