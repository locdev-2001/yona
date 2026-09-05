<?php

namespace App\Http\Controllers\WebApi\Contacts;

use App\Http\Controllers\Controller;
use App\Http\Resources\ConversationResource;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Port từ Api::V1::Accounts::Contacts::ConversationsController: 20 hội thoại gần
// nhất của liên hệ, lọc theo quyền xem hộp thư như danh sách chính.
class ConversationsController extends Controller
{
    private const RESULTS_LIMIT = 20;

    public function index(Request $request, Account $account, int $contactId): JsonResponse
    {
        $contact = $account->contacts()->findOrFail($contactId);

        // Dùng lại đúng phép lọc quyền của danh sách chính (PermissionFilterService).
        $accountUser = $request->attributes->get('currentAccountUser');
        $assignedInboxIds = $request->user()->assignedInboxes($account, $accountUser)->pluck('id');

        $conversations = $account->conversations()
            ->where('contact_id', $contact->id)
            ->whereIn('inbox_id', $assignedInboxIds)
            ->with(['assignee', 'contact', 'inbox', 'labels'])
            ->orderByDesc('last_activity_at')
            ->limit(self::RESULTS_LIMIT)
            ->get();

        return response()->json(['payload' => ConversationResource::collection($conversations)->resolve()]);
    }
}
