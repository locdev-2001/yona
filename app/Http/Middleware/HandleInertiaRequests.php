<?php

namespace App\Http\Middleware;

use App\Enums\TenantPermission;
use App\Models\Admin;
use App\Models\Announcement;
use App\Models\User;
use App\Models\WorkspaceMember;
use App\Services\AnnouncementReadService;
use App\Services\NotificationService;
use App\Support\TenantScope;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $admin = $request->user('admin');
        $user = $request->user('web');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'admin' => $admin ? $this->adminPayload($admin) : null,
                'user' => $user ? $this->userPayload($user) : null,
                'workspaces' => $user ? $this->workspaceList($user) : [],
                // Lazy: IdentifyWorkspace binds the context AFTER Inertia::share()
                // runs, so these resolve at response time.
                'membership' => fn () => $this->membershipPayload($user),
                'impersonating' => session('impersonator_admin_id')
                    ? [
                        'admin_id' => session('impersonator_admin_id'),
                        'workspace_id' => session('current_workspace_id'),
                    ]
                    : null,
            ],
            'activeWorkspace' => fn () => $this->activeWorkspacePayload(),
            // Lazy: resolved after IdentifyWorkspace; null for guests and admin sessions.
            'unreadAnnouncementCount' => fn () => $user
                ? app(AnnouncementReadService::class)->getUnreadCount($user)
                : null,
            'latestUnreadAnnouncement' => fn () => $user
                ? $this->latestUnreadAnnouncementPayload(
                    app(AnnouncementReadService::class)->getLatestUnread($user)
                )
                : null,
            // P04 — Notifications bell: unread count + recent 5 unread.
            // Lazy: resolved after IdentifyWorkspace; null for guests.
            'notifications' => fn () => $user && currentWorkspace()
                ? $this->notificationsPayload($user)
                : null,
            'locale' => app()->getLocale(),
            'i18n' => $this->translationsPayload(),
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function adminPayload(Admin $admin): array
    {
        // share() runs before the admin.scope middleware binds the platform
        // scope, so mirror BindAdminPermissionScope here: read the admin's
        // platform permissions under PLATFORM_SCOPE, otherwise getAllPermissions()
        // returns empty under RLS-enforced connections.
        TenantScope::bind(Admin::PLATFORM_SCOPE);
        $admin->unsetRelation('roles')->unsetRelation('permissions');
        $permissions = $admin->getAllPermissions()->pluck('name')->all();

        // This payload is built EAGERLY, but the tenant props (membership,
        // notifications, announcements) resolve LAZILY at response time. When an
        // admin guard is co-authenticated in the same session — manual admin+tenant
        // dual-login, or an active impersonation — leaving the scope on
        // PLATFORM_SCOPE would make every lazy tenant read return empty (the
        // sidebar menu vanishes). Restore the request's tenant scope, or clear it
        // entirely on a pure admin-plane request.
        if ($workspace = currentWorkspace()) {
            TenantScope::bind($workspace->id);
        } else {
            TenantScope::forget();
        }

        return [
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'permissions' => $permissions,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => $user->avatar ?? null,
            'locale' => $user->locale,
            'timezone' => $user->timezone,
        ];
    }

    /**
     * The user's active workspaces for the switcher — across all workspaces, so
     * we drop the per-tenant global scope and let RLS expose the caller's own
     * membership rows via app.current_user_id (set here).
     *
     * @return list<array<string, mixed>>
     */
    private function workspaceList(User $user): array
    {
        TenantScope::bindUser($user->getKey());

        return WorkspaceMember::withoutGlobalScope('workspace')
            ->where('user_id', $user->getKey())
            ->where('status', 'active')
            ->with('workspace:id,name,slug')
            ->get()
            ->map(fn (WorkspaceMember $member) => [
                'id' => $member->workspace_id,
                'name' => $member->workspace?->name,
                'slug' => $member->workspace?->slug,
                'role' => $member->role,
            ])
            ->all();
    }

    /**
     * The active membership (role + permissions) within the current workspace,
     * or null on pages without a workspace context.
     *
     * @return array<string, mixed>|null
     */
    /**
     * All translation namespaces for the active locale, loaded dynamically so any
     * new lang/<locale>/<namespace>.php file is auto-registered on the frontend —
     * single source of truth, no hardcoded namespace list to keep in sync.
     *
     * @return array<string, mixed>
     */
    private function translationsPayload(): array
    {
        $locale = app()->getLocale();
        $payload = [];

        foreach (glob(lang_path($locale.'/*.php')) ?: [] as $file) {
            $namespace = basename($file, '.php');
            $payload[$namespace] = trans($namespace, [], $locale);
        }

        return $payload;
    }

    private function membershipPayload(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        // Primary: IdentifyWorkspace middleware binds currentMembership() for
        // workspace-scoped routes. On auth-only routes (profile, password,
        // appearance) that middleware does NOT run, so currentMembership() returns
        // null — which caused the CRM sidebar to vanish (BUG-12). Defensively
        // resolve from the session workspace so the sidebar always has permissions.
        $membership = currentMembership() ?? $this->resolveMembershipFromSession($user);

        if (! $membership) {
            return null;
        }

        // Defense in depth: re-assert the tenant scope (drop any roles loaded
        // under another scope) so getAllPermissions() reads from the correct tenant.
        // Guards against a co-authenticated admin payload having left the scope on
        // PLATFORM_SCOPE.
        TenantScope::bind($membership->workspace_id);
        $user->unsetRelation('roles')->unsetRelation('permissions');

        // Workspace admin/owner gets the full permission catalog so the sidebar
        // never depends on individually-granted permissions (mirrors the
        // Gate::before backend bypass). New permissions appear with zero re-seed.
        $permissions = $membership->role === 'admin'
            ? TenantPermission::values()
            : $user->getAllPermissions()->pluck('name')->all();

        return [
            'role' => $membership->role,
            'team_id' => $membership->team_id,
            'permissions' => $permissions,
        ];
    }

    /**
     * Defensive fallback: resolve membership for auth-only routes (profile,
     * password, appearance) that skip IdentifyWorkspace. Mirrors the same
     * session-preference + oldest-active-fallback logic used in IdentifyWorkspace.
     * Returns null when the user has no active membership (new signup, etc.).
     */
    private function resolveMembershipFromSession(User $user): ?WorkspaceMember
    {
        TenantScope::bindUser($user->getKey());

        $sessionWorkspaceId = request()->session()->get('current_workspace_id');

        $base = fn () => WorkspaceMember::withoutGlobalScope('workspace')
            ->where('user_id', $user->getKey())
            ->where('status', 'active');

        if ($sessionWorkspaceId && $preferred = $base()->where('workspace_id', $sessionWorkspaceId)->first()) {
            return $preferred;
        }

        return $base()->oldest()->first();
    }

    /**
     * Minimal announcement payload for the shared latestUnreadAnnouncement prop.
     *
     * @return array<string, mixed>|null
     */
    private function latestUnreadAnnouncementPayload(?Announcement $announcement): ?array
    {
        if (! $announcement) {
            return null;
        }

        return [
            'id' => $announcement->id,
            'title' => $announcement->title,
            'body_html' => $announcement->body_html,
            'category' => $announcement->category?->value,
            'published_at' => $announcement->published_at?->toISOString(),
            'cover_image' => $announcement->cover_image,
            'slug' => $announcement->slug,
        ];
    }

    /**
     * Notification bell payload: unread count + recent 5 unread items.
     *
     * @return array<string, mixed>
     */
    private function notificationsPayload(User $user): array
    {
        $service = app(NotificationService::class);

        $recent = $user->unreadNotifications()
            ->take(5)
            ->get()
            ->map(fn ($n) => [
                'id' => $n->id,
                'action' => data_get($n->data, 'action'),
                'subject_type' => data_get($n->data, 'subject_type'),
                'subject_id' => data_get($n->data, 'subject_id'),
                'link' => data_get($n->data, 'link'),
                'created_at' => $n->created_at?->toISOString(),
            ])
            ->all();

        return [
            'unread' => $service->unreadCount($user),
            'recent' => $recent,
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function activeWorkspacePayload(): ?array
    {
        $workspace = currentWorkspace();

        if (! $workspace) {
            return null;
        }

        return [
            'id' => $workspace->id,
            'name' => $workspace->name,
            'slug' => $workspace->slug,
            'base_currency' => $workspace->base_currency,
            'timezone' => $workspace->timezone,
            'locale' => $workspace->locale,
        ];
    }
}
