<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Channel\Yona;
use App\Models\ContactInbox;
use App\Models\User;
use App\Services\Users\Friendships;
use App\Services\Yona\YonaInboxes;
use App\Services\Yona\YonaRelay;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Người dùng Yona trong hộp thư của mình: trạng thái bạn bè từng người, và lấy (chưa có
// thì thêm, không mở hội thoại) hồ sơ một người để xem từ ô tìm hay lời mời kết bạn.
class YonaContactsController extends Controller
{
    // Người dùng Yona trong hộp thư và đã là bạn bè chưa: danh sách hội thoại đánh dấu người lạ.
    public function index(Request $request, Account $account, YonaInboxes $inboxes, Friendships $friendships): JsonResponse
    {
        $friendIds = array_flip($friendships->friendIds($request->user()));

        $payload = $inboxes->ensureForAccount($account)->contactInboxes()
            ->where('source_id', 'like', Yona::CONTACT_SOURCE_PREFIX.'%')
            ->get(['contact_id', 'source_id'])
            ->map(fn (ContactInbox $contactInbox) => [
                'contact_id' => $contactInbox->contact_id,
                'is_friend' => isset($friendIds[Yona::userIdFromSourceId($contactInbox->source_id)]),
            ])
            ->values();

        return response()->json(['payload' => $payload]);
    }

    public function store(Request $request, Account $account, YonaRelay $relay): JsonResponse
    {
        $userId = (int) $request->validate(['user_id' => ['required', 'integer', 'exists:users,id']])['user_id'];
        abort_if($userId === $request->user()->id, 422, __('friends.ERRORS.SELF'));

        $person = User::query()->whereNotNull('username')->findOrFail($userId);

        return response()->json(['id' => $relay->contactFor($account, $person)?->contact_id]);
    }
}
