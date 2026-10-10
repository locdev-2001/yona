<?php

namespace App\Http\Controllers\WebApi\Contacts;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Inbox;
use App\Services\Contacts\ContactableInboxes;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Hộp thư người trực mở được hội thoại mới tới liên hệ, theo đúng luật xem hộp thư của danh sách chính.
class ContactableInboxesController extends Controller
{
    public function index(Request $request, Account $account, int $contactId, ContactableInboxes $contactableInboxes): JsonResponse
    {
        $contact = $account->contacts()->findOrFail($contactId);
        $visibleInboxes = $request->user()->assignedInboxes($account, $request->attributes->get('currentAccountUser'));

        $payload = array_map(static fn (array $entry) => [
            'inbox' => self::inboxPayload($entry['inbox']),
            'source_id' => $entry['source_id'],
            'display_address' => $entry['display_address'],
            'available' => $entry['available'],
            'reason' => $entry['reason'],
        ], $contactableInboxes->for($contact, $visibleInboxes));

        return response()->json(['payload' => $payload]);
    }

    /** @return array<string, mixed> */
    private static function inboxPayload(Inbox $inbox): array
    {
        return [
            'id' => $inbox->id,
            'name' => $inbox->name,
            'channel_type' => $inbox->channel_type,
            'capabilities' => $inbox->capabilities()->values(),
            'platform' => $inbox->platform()->toArray(),
            'avatar_url' => $inbox->avatarUrl(),
        ];
    }
}
