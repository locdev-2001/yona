<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Platform (read-only) view over customer workspaces. Membership rows are
 * workspace-scoped under RLS, so they are read via the privileged connection
 * (the elevated read path) — an admin is not bound to any single workspace.
 */
class WorkspaceController extends Controller
{
    public function index(): Response
    {
        $workspaces = Workspace::query()
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'status', 'base_currency', 'created_at'])
            ->map(fn (Workspace $workspace) => [
                'id' => $workspace->id,
                'name' => $workspace->name,
                'slug' => $workspace->slug,
                'status' => $workspace->status,
                'base_currency' => $workspace->base_currency,
                'created_at' => $workspace->created_at?->toDateString(),
            ]);

        return Inertia::render('admin/workspaces/index', ['workspaces' => $workspaces]);
    }

    public function show(Workspace $workspace): Response
    {
        $members = WorkspaceMember::on('pgsql_privileged')
            ->withoutGlobalScope('workspace')
            ->where('workspace_id', $workspace->id)
            ->with('user:id,name,email')
            ->orderBy('role')
            ->get()
            ->map(fn (WorkspaceMember $member) => [
                'id' => $member->id,
                'user_id' => $member->user_id,
                'name' => $member->user?->name,
                'email' => $member->user?->email,
                'role' => $member->role,
                'status' => $member->status,
            ]);

        return Inertia::render('admin/workspaces/show', [
            'workspace' => [
                'id' => $workspace->id,
                'name' => $workspace->name,
                'slug' => $workspace->slug,
                'status' => $workspace->status,
                'base_currency' => $workspace->base_currency,
                'timezone' => $workspace->timezone,
            ],
            'members' => $members,
        ]);
    }
}
