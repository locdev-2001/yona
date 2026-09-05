<?php

namespace App\Http\Controllers\WebApi\Contacts;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Contact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Port từ Api::V1::Accounts::Contacts::LabelsController + LabelConcern.
class LabelsController extends Controller
{
    public function index(Request $request, Account $account, int $contactId): JsonResponse
    {
        return response()->json(['payload' => $this->fetchContact($account, $contactId)->labelList()]);
    }

    public function create(Request $request, Account $account, int $contactId): JsonResponse
    {
        $contact = $this->fetchContact($account, $contactId);
        $contact->updateLabels($request->input('labels'));

        return response()->json(['payload' => $contact->labelList()]);
    }

    private function fetchContact(Account $account, int $contactId): Contact
    {
        return $account->contacts()->findOrFail($contactId);
    }
}
