<?php

namespace App\Http\Controllers\App;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Inertia\Inertia;
use Inertia\Response;

// Mặt tiền web cho /contacts — tương đương contacts routes.js
// (permissions administrator + agent; segments/labels/active port sau).
class ContactsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('dashboard/contacts/Index');
    }

    public function show(Account $account, int $contactId): Response
    {
        return Inertia::render('dashboard/contacts/Show', [
            'contactId' => $account->contacts()->whereKey($contactId)->firstOrFail()->id,
        ]);
    }
}
