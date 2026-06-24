<?php

namespace App\Http\Controllers\Clients;

use App\Http\Controllers\Controller;
use App\Http\Requests\Clients\SyncCustomerAdminsRequest;
use App\Models\Client;
use App\Services\ClientService;
use Illuminate\Http\RedirectResponse;

/**
 * P06 — Sync customer-admin delegation for a client.
 * Single endpoint (POST sync); full replacement of admin list.
 * G12 — service validates each userId is active WorkspaceMember.
 */
class ClientCustomerAdminController extends Controller
{
    public function sync(SyncCustomerAdminsRequest $request, Client $client, ClientService $service): RedirectResponse
    {
        $service->syncCustomerAdmins($client, $request->validated()['user_ids']);

        return redirect()
            ->route('clients.show', $client)
            ->with('success', __('clients.flash.admins_updated'));
    }
}
