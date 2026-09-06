<?php

namespace App\Http\Controllers\App;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Inertia\Inertia;
use Inertia\Response;

// Mặt tiền web cho /contacts — tương đương contacts routes.js
// (permissions administrator + agent).
class ContactsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('dashboard/contacts/Index');
    }

    // contacts_dashboard_labels_index
    public function label(Account $account, string $label): Response
    {
        return Inertia::render('dashboard/contacts/Index', ['label' => $label]);
    }

    // contacts_dashboard_active
    public function active(): Response
    {
        return Inertia::render('dashboard/contacts/Index', ['isActiveView' => true]);
    }

    public function show(Account $account, int $contactId): Response
    {
        return Inertia::render('dashboard/contacts/Show', [
            'contactId' => $account->contacts()->whereKey($contactId)->firstOrFail()->id,
        ]);
    }
}
