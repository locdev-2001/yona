<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use App\Models\User;
use App\Models\WorkspaceMember;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
            'locale' => app()->getLocale(),
            'i18n' => ['platform' => trans('platform')],
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
        return [
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'permissions' => $admin->getAllPermissions()->pluck('name')->all(),
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
        DB::statement("select set_config('app.current_user_id', ?, false)", [(string) $user->getKey()]);

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
    private function membershipPayload(?User $user): ?array
    {
        $membership = currentMembership();

        if (! $user || ! $membership) {
            return null;
        }

        return [
            'role' => $membership->role,
            'team_id' => $membership->team_id,
            'permissions' => $user->getAllPermissions()->pluck('name')->all(),
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
