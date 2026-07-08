<?php

namespace App\Http\Controllers\Tenancy\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\WorkspaceUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Workspace settings (admin). Operates on the ACTIVE workspace bound by
 * IdentifyWorkspace; the form gate is enforced server-side in the FormRequest.
 */
class WorkspaceController extends Controller
{
    public function edit(): Response
    {
        $workspace = currentWorkspace();

        abort_unless($workspace !== null && (auth()->user()?->can('tenant.workspace.update') ?? false), 403);

        return Inertia::render('settings/workspace', [
            'workspace' => [
                'name' => $workspace->name,
                'base_currency' => $workspace->base_currency,
                'timezone' => $workspace->timezone,
                'locale' => $workspace->locale,
                'audit_retention' => $workspace->audit_retention,
            ],
            'options' => [
                'currencies' => ['VND', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'AUD'],
                'timezones' => timezone_identifiers_list(),
                'locales' => ['vi', 'en'],
                'retentions' => ['30d', '90d', '1y', 'forever'],
            ],
        ]);
    }

    public function update(WorkspaceUpdateRequest $request): RedirectResponse
    {
        $workspace = currentWorkspace();
        $workspace->fill($request->validated());
        $workspace->save();

        return back()->with('success', __('platform.workspace.saved'));
    }
}
