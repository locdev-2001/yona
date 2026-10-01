<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AccountUser;
use App\Support\SuperAdminArea;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

// — chỉ có biểu mẫu gắn người dùng vào account, nằm ngay trong trang show của
// Account/User nên không có màn riêng.
class AccountUsersController extends Controller
{
    public function show(int $id): RedirectResponse
    {
        $accountUser = AccountUser::query()->findOrFail($id);

        return redirect(SuperAdminArea::url("users/{$accountUser->user_id}"));
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

        return back()->with('notice', __('admin_layout.flash.account_user_created'));
    }

    public function destroy(int $id): RedirectResponse
    {
        AccountUser::query()->findOrFail($id)->delete();

        return back()->with('notice', __('admin_layout.flash.account_user_destroyed'));
    }
}
