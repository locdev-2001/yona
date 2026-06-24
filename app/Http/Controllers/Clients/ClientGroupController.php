<?php

namespace App\Http\Controllers\Clients;

use App\Http\Controllers\Controller;
use App\Http\Requests\Clients\ClientGroupStoreRequest;
use App\Models\ClientGroup;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * P06 — Client group CRUD (no show/create/edit — list+store+update+destroy only).
 */
class ClientGroupController extends Controller
{
    public function index(): Response
    {
        $this->authorize('viewAny', ClientGroup::class);

        $groups = ClientGroup::orderBy('name')->withCount('clients')->get();

        return Inertia::render('clients/groups', [
            'groups' => $groups,
        ]);
    }

    public function store(ClientGroupStoreRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        ClientGroup::create([
            'name' => $validated['name'],
            'slug' => $validated['slug'] ?? Str::slug($validated['name']),
        ]);

        return back()->with('success', __('clients.flash.group_created'));
    }

    public function update(ClientGroupStoreRequest $request, ClientGroup $clientGroup): RedirectResponse
    {
        $this->authorize('update', $clientGroup);

        $validated = $request->validated();

        $clientGroup->update([
            'name' => $validated['name'],
            'slug' => $validated['slug'] ?? Str::slug($validated['name']),
        ]);

        return back()->with('success', __('clients.flash.group_updated'));
    }

    public function destroy(ClientGroup $clientGroup): RedirectResponse
    {
        $this->authorize('delete', $clientGroup);

        $clientGroup->delete();

        return back()->with('success', __('clients.flash.group_deleted'));
    }
}
