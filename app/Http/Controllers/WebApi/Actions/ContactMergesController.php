<?php

namespace App\Http\Controllers\WebApi\Actions;

use App\Actions\ContactMergeAction;
use App\Http\Controllers\Controller;
use App\Http\Resources\ContactResource;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Port từ Api::V1::Accounts::Actions::ContactMergesController.
class ContactMergesController extends Controller
{
    public function create(Request $request, Account $account): JsonResponse
    {
        $baseContact = $account->contacts()->findOrFail($request->input('base_contact_id'));
        $mergeeContact = $account->contacts()->findOrFail($request->input('mergee_contact_id'));

        $mergedContact = (new ContactMergeAction($account, $baseContact, $mergeeContact))->perform();

        return response()->json((new ContactResource($mergedContact))->toArray($request));
    }
}
