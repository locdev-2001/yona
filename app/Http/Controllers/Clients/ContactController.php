<?php

namespace App\Http\Controllers\Clients;

use App\Http\Controllers\Controller;
use App\Http\Requests\Clients\ContactStoreRequest;
use App\Http\Requests\Clients\ContactUpdateRequest;
use App\Models\Client;
use App\Models\Contact;
use App\Services\ClientService;
use Illuminate\Http\RedirectResponse;

/**
 * P06 — Contact controller (nested under clients, shallow resource).
 * Thin: parse → service → redirect back to client show.
 */
class ContactController extends Controller
{
    public function store(ContactStoreRequest $request, Client $client, ClientService $service): RedirectResponse
    {
        $validated = $request->validated();

        $service->addContact(
            client: $client,
            contactData: collect($validated)->only(['first_name', 'last_name', 'email', 'phone', 'title', 'language'])->toArray(),
            makePrimary: (bool) ($validated['make_primary'] ?? false),
            customFields: $validated['custom_fields'] ?? [],
        );

        return redirect()
            ->route('clients.show', $client)
            ->with('success', __('clients.flash.contact_added'));
    }

    public function update(ContactUpdateRequest $request, Contact $contact, ClientService $service): RedirectResponse
    {
        $validated = $request->validated();

        $service->updateContact(
            contact: $contact,
            contactData: collect($validated)->only(['first_name', 'last_name', 'email', 'phone', 'title', 'language'])->toArray(),
            makePrimary: (bool) ($validated['make_primary'] ?? false),
            customFields: $validated['custom_fields'] ?? [],
        );

        return redirect()
            ->route('clients.show', $contact->client_id)
            ->with('success', __('clients.flash.contact_updated'));
    }

    public function destroy(Contact $contact, ClientService $service): RedirectResponse
    {
        $this->authorize('delete', $contact);

        $clientId = $contact->client_id;
        $service->deleteContact($contact);

        return redirect()
            ->route('clients.show', $clientId)
            ->with('success', __('clients.flash.contact_deleted'));
    }

    /**
     * Set a contact as the primary contact (non-enumeration: 404 if no access).
     */
    public function makePrimary(Contact $contact, ClientService $service): RedirectResponse
    {
        $this->authorize('update', $contact);

        $service->setPrimary($contact);

        return redirect()
            ->route('clients.show', $contact->client_id)
            ->with('success', __('clients.flash.primary_changed'));
    }
}
