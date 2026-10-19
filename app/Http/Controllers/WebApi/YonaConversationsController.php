<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\User;
use App\Services\Yona\YonaRelay;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Nhắn người mới: chọn một người dùng Yona là mở hội thoại với họ trong hộp thư Yona.
class YonaConversationsController extends Controller
{
    public function store(Request $request, Account $account, YonaRelay $relay): JsonResponse
    {
        $userId = (int) $request->validate(['user_id' => ['required', 'integer', 'exists:users,id']])['user_id'];
        abort_if($userId === $request->user()->id, 422, __('chat.ERRORS.SELF'));

        $conversation = $relay->openWith($account, User::query()->findOrFail($userId));

        return response()->json(['id' => $conversation->display_id]);
    }
}
