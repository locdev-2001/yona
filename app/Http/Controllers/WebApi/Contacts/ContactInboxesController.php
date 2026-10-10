<?php

namespace App\Http\Controllers\WebApi\Contacts;

use App\Builders\ContactInboxBuilder;
use App\Http\Controllers\Controller;
use App\Http\Resources\ContactResource;
use App\Models\Account;
use App\Models\AccountUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Port từ Api::V1::Accounts::Contacts::ContactInboxesController — tạo
// contact_inbox cho contact trên một inbox (nền cho New conversation ở B3).
class ContactInboxesController extends Controller
{
    public function store(Request $request, Account $account, int $contactId): JsonResponse
    {
        $contact = $account->contacts()->findOrFail($contactId);
        $inbox = $account->inboxes()->findOrFail((int) $request->input('inbox_id'));

        // ensure_inbox + authorize :show? — agent không phải member inbox → 401.
        /** @var AccountUser $accountUser */
        $accountUser = $request->attributes->get('currentAccountUser');
        abort_unless(
            $accountUser->isAdministrator()
                || $inbox->inboxMembers()->where('user_id', $request->user()->id)->exists(),
            401,
            'You are not authorized to do this action'
        );

        $contactInbox = (new ContactInboxBuilder(
            contact: $contact,
            inbox: $inbox,
            sourceId: $request->input('source_id'),
            hmacVerified: filter_var($request->input('hmac_verified'), FILTER_VALIDATE_BOOLEAN),
            outbound: true,
        ))->perform();

        if ($contactInbox === null) {
            return response()->json(['error' => __('errors.conversations.contact_unreachable')], 422);
        }

        return response()->json(ContactResource::contactInboxPayload($contactInbox));
    }
}
