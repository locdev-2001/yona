<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\User;
use App\Services\Yona\YonaRelay;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Hồ sơ một người dùng Yona trong hộp thư của mình (chưa có thì thêm, không mở hội
// thoại): để xem hồ sơ người gửi lời mời kết bạn hay người mình vừa mời.
class YonaContactsController extends Controller
{
    public function store(Request $request, Account $account, YonaRelay $relay): JsonResponse
    {
        $userId = (int) $request->validate(['user_id' => ['required', 'integer', 'exists:users,id']])['user_id'];
        abort_if($userId === $request->user()->id, 422, __('friends.ERRORS.SELF'));

        $person = User::query()->whereNotNull('username')->findOrFail($userId);

        return response()->json(['id' => $relay->contactFor($account, $person)?->contact_id]);
    }
}
