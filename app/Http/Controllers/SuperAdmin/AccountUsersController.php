<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AccountUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

// Port từ refs/chatwoot/app/controllers/super_admin/account_users_controller.rb
// — chỉ có biểu mẫu gắn người dùng vào account, nằm ngay trong trang show của
// Account/User nên không có màn riêng.
class AccountUsersController extends Controller
{
    public function show(int $id): RedirectResponse
    {
        $accountUser = AccountUser::query()->findOrFail($id);

        return redirect("/super_admin/users/{$accountUser->user_id}");
    }

    public function store(Request $request): RedirectResponse
    {
        $payload = $request->validate([
            'account_user.account_id' => 'required|integer|exists:accounts,id',
            'account_user.user_id' => 'required|integer|exists:users,id',
            'account_user.role' => 'nullable|string',
        ])['account_user'];

        AccountUser::query()->create([
            'account_id' => $payload['account_id'],
            'user_id' => $payload['user_id'],
            'role' => AccountUser::roleFromName($payload['role'] ?? 'agent'),
        ]);

        return back()->with('notice', 'Account user was successfully created.');
    }

    public function destroy(int $id): RedirectResponse
    {
        AccountUser::query()->findOrFail($id)->delete();

        return back()->with('notice', 'Account user was successfully destroyed.');
    }
}
