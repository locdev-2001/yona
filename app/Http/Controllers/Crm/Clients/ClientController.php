<?php

namespace App\Http\Controllers\Crm\Clients;

use App\Http\Controllers\Controller;
use App\Http\Requests\Clients\ClientStoreRequest;
use App\Http\Requests\Clients\ClientUpdateRequest;
use App\Models\Client;
use App\Models\ClientGroup;
use App\Services\ClientService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\User;
use App\Models\CustomFieldDefinition;

/**
 * P06 — Thin client controller. Parse → Service → Inertia/redirect.
 * Non-enumeration: foreign record → abort(404) via route-model-binding + RLS.
 */
class ClientController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Client::class);

        $user = $request->user();
        $canViewAll = $user->can('tenant.client.view');

        $query = Client::query()
            ->with([
                'primaryContact:id,client_id,first_name,last_name,is_primary',
                'groups:id,name',
                'owner:id,name',
            ]);

        // Visibility filter: if only view_own, limit to owned or customer-admin (G2)
        if (! $canViewAll) {
            $userId = $user->id;
            $query->where(function ($q) use ($userId) {
                $q->where('owner_id', $userId)
                    ->orWhereHas('customerAdmins', fn ($q2) => $q2->where('users.id', $userId));
            });
        }

        // Search filter
        if ($search = $request->string('search')->toString()) {
            $query->where('name', 'ilike', '%'.$search.'%');
        }

        // Group filter
        if ($groupId = $request->input('group')) {
            $query->whereHas('groups', fn ($q) => $q->where('client_groups.id', $groupId));
        }

        $clients = $query->orderBy('name')->paginate(20)->withQueryString();

        return Inertia::render('crm/clients/index', [
            'clients' => $clients,
            'groups' => ClientGroup::orderBy('name')->get(['id', 'name']),
            'filters' => $request->only(['search', 'group']),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Client::class);

        return Inertia::render('crm/clients/create', [
            'groups' => ClientGroup::orderBy('name')->get(['id', 'name', 'slug']),
            'clientFieldDefs' => CustomFieldDefinition::forEntity('client')->active()->ordered()->get(),
            'contactFieldDefs' => CustomFieldDefinition::forEntity('contact')->active()->ordered()->get(),
        ]);
    }

    public function store(ClientStoreRequest $request, ClientService $service): RedirectResponse
    {
        $validated = $request->validated();

        $client = $service->create(
            clientData: collect($validated)->only([
                'name', 'vat', 'phone', 'website', 'currency', 'default_language',
                'billing_street', 'billing_city', 'billing_state', 'billing_zip', 'billing_country',
                'shipping_street', 'shipping_city', 'shipping_state', 'shipping_zip', 'shipping_country',
            ])->toArray(),
            primaryContactData: $validated['primary_contact'] ?? null,
            customFields: $validated['custom_fields'] ?? [],
            groupIds: $validated['groups'] ?? [],
        );

        return redirect()
            ->route('clients.show', $client)
            ->with('success', __('clients.flash.created'));
    }

    public function show(Request $request, Client $client): Response
    {
        $this->authorize('view', $client);

        $client->load([
            'contacts:id,client_id,first_name,last_name,email,phone,title,is_primary,language,custom_fields',
            'groups:id,name,slug',
            'owner:id,name',
            'customerAdmins:id,name',
            'activities' => fn ($q) => $q->latest('occurred_at')->limit(50),
            'tags',
            'attachments.uploader:id,name',
            'notes.author:id,name',
            'vaultEntries',
        ]);

        $user = $request->user();

        return Inertia::render('crm/clients/show', [
            'client' => $client,
            'clientFieldDefs' => CustomFieldDefinition::forEntity('client')->active()->ordered()->get(),
            'contactFieldDefs' => CustomFieldDefinition::forEntity('contact')->active()->ordered()->get(),
            'availableGroups' => ClientGroup::orderBy('name')->get(['id', 'name']),
            'availableAdmins' => User::whereHas(
                'memberships',
                fn ($q) => $q->where('workspace_id', currentWorkspace()->id)->where('status', 'active')
            )->get(['id', 'name']),
            'canEdit' => $user->can('update', $client),
            'canDelete' => $user->can('delete', $client),
            'vaultEntries' => $client->vaultEntries,
            'attachments' => $client->attachments,
            'notes' => $client->notes,
        ]);
    }

    public function edit(Client $client): Response
    {
        $this->authorize('update', $client);

        $client->load(['groups:id,name,slug', 'owner:id,name']);

        return Inertia::render('crm/clients/edit', [
            'client' => $client,
            'groups' => ClientGroup::orderBy('name')->get(['id', 'name', 'slug']),
            'clientFieldDefs' => CustomFieldDefinition::forEntity('client')->active()->ordered()->get(),
        ]);
    }

    public function update(ClientUpdateRequest $request, Client $client, ClientService $service): RedirectResponse
    {
        $validated = $request->validated();

        $service->update(
            client: $client,
            clientData: collect($validated)->only([
                'name', 'vat', 'phone', 'website', 'currency', 'default_language',
                'billing_street', 'billing_city', 'billing_state', 'billing_zip', 'billing_country',
                'shipping_street', 'shipping_city', 'shipping_state', 'shipping_zip', 'shipping_country',
            ])->toArray(),
            customFields: $validated['custom_fields'] ?? [],
        );

        if (isset($validated['groups'])) {
            $service->syncGroups($client, $validated['groups']);
        }

        return redirect()
            ->route('clients.show', $client)
            ->with('success', __('clients.flash.updated'));
    }

    public function destroy(Client $client, ClientService $service): RedirectResponse
    {
        $this->authorize('delete', $client);

        $service->delete($client);

        return redirect()
            ->route('clients.index')
            ->with('success', __('clients.flash.deleted'));
    }
}

