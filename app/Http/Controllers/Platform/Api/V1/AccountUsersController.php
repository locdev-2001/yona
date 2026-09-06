<?php

namespace App\Http\Controllers\Platform\Api\V1;

use App\Models\Account;
use App\Models\AccountUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Port từ refs/chatwoot/app/controllers/platform/api/v1/account_users_controller.rb.
// Bản gốc render thẳng model nên payload là toàn bộ cột của account_users.
class AccountUsersController extends PlatformController
{
    public function index(Request $request, Account $account): JsonResponse
    {
        return $this->denyUnlessPermissible($request, $account)
            ?? response()->json($account->accountUsers()->get());
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        if ($denied = $this->denyUnlessPermissible($request, $account)) {
            return $denied;
        }

        $accountUser = $account->accountUsers()->firstOrNew(['user_id' => $request->input('user_id')]);

        if ($request->has('role')) {
            $accountUser->role = $this->role($request);
        }

        $accountUser->save();

        return response()->json($accountUser->fresh());
    }

    public function destroy(Request $request, Account $account): JsonResponse
    {
        if ($denied = $this->denyUnlessPermissible($request, $account)) {
            return $denied;
        }

        $account->accountUsers()->where('user_id', $request->input('user_id'))->first()?->delete();

        return response()->json([]);
    }

    private function role(Request $request): int
    {
        $role = $request->input('role');

        return is_numeric($role) ? (int) $role : AccountUser::roleFromName((string) $role);
    }
}
