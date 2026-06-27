<?php

namespace Modules\CrmSales\Http\Controllers\Clients;

use App\Http\Controllers\Controller;
use Modules\CrmSales\Http\Requests\Clients\ClientVaultEntryRequest;
use Modules\CrmSales\Models\Client;
use Modules\CrmSales\Models\ClientVaultEntry;
use Modules\CrmSales\Services\ClientVaultService;
use Illuminate\Http\RedirectResponse;

/**
 * P06 (should) — Vault entry CRUD nested under a client.
 */
class ClientVaultEntryController extends Controller
{
    public function store(ClientVaultEntryRequest $request, Client $client, ClientVaultService $vaultService): RedirectResponse
    {
        $vaultService->store($client, $request->validated());

        return redirect()
            ->route('clients.show', $client)
            ->with('success', __('clients.flash.vault_created'));
    }

    public function update(ClientVaultEntryRequest $request, Client $client, ClientVaultEntry $vaultEntry, ClientVaultService $vaultService): RedirectResponse
    {
        $this->authorize('update', $client);

        $vaultService->update($vaultEntry, $request->validated());

        return redirect()
            ->route('clients.show', $client)
            ->with('success', __('clients.flash.vault_updated'));
    }

    public function destroy(Client $client, ClientVaultEntry $vaultEntry, ClientVaultService $vaultService): RedirectResponse
    {
        $this->authorize('update', $client);

        $vaultService->delete($vaultEntry);

        return redirect()
            ->route('clients.show', $client)
            ->with('success', __('clients.flash.vault_deleted'));
    }
}

