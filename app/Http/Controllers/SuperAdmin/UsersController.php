<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\SuperAdminImpersonation;
use App\Models\User;
use App\Support\SuperAdmin\Dashboard;
use App\Support\SuperAdmin\Dashboards\UserDashboard;
use App\Support\SuperAdminArea;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UsersController extends ResourceController
{
    protected function dashboard(): Dashboard
    {
        return app(UserDashboard::class);
    }

    protected function showProps(Model $record): array
    {
        return [
            'accountUserForm' => [
                'userId' => $record->getKey(),
                'accounts' => Account::query()->orderByDesc('id')->get(['id', 'name'])
                    ->map(fn (Account $account) => ['value' => $account->id, 'label' => "#{$account->id} {$account->name}"])->all(),
                'roles' => array_values(AccountUser::ROLE_NAMES),
            ],
            'mfaEnabled' => $record->mfaEnabled(),
            'confirmed' => $record->isConfirmed(),
            'impersonateUrl' => SuperAdminArea::url("users/{$record->getKey()}/impersonate"),
            'csrf' => csrf_token(),
        ];
    }

    protected function assign(Model $record, Request $request): void
    {
        $payload = (array) $request->input('user', []);

        // resource_params: mật khẩu để trống nghĩa là giữ nguyên.
        if (blank($payload['password'] ?? null)) {
            unset($payload['password']);
        } else {
            $request->validate(['user.password' => User::passwordRules()]);
        }

        foreach (['name', 'display_name', 'email', 'password', 'confirmed_at', 'type'] as $attribute) {
            if (array_key_exists($attribute, $payload)) {
                $record->{$attribute} = $payload[$attribute] === '' ? null : $payload[$attribute];
            }
        }
    }

    public function destroyAvatar(int $id): RedirectResponse
    {
        $this->findRecord($id)->removeAvatar();

        return back();
    }

    public function resendConfirmation(int $id): RedirectResponse
    {
        $user = $this->findRecord($id);

        if ($user->isConfirmed()) {
            return back()->with('alert', __('super_admin.users.resend_confirmation.already_confirmed'));
        }

        $user->sendConfirmationInstructions();

        return back()->with('notice', __('super_admin.users.resend_confirmation.sent'));
    }

    // Mở phiên đăng nhập dưới danh nghĩa người dùng (generate_sso_link_with_impersonation).
    // Bắt buộc lý do, ghi vào super_admin_impersonations: mọi lượt đăng nhập hộ
    // phải truy vết được ai, hộ ai, vì sao.
    public function impersonate(Request $request, int $id): RedirectResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:10', 'max:500'],
        ]);

        $target = $this->findRecord($id);

        $token = $target->generateSsoAuthToken(impersonation: true);

        SuperAdminImpersonation::query()->create([
            'super_admin_id' => Auth::guard('super_admin')->id(),
            'target_user_id' => $target->getKey(),
            'reason' => $data['reason'],
            'ip_address' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
            'token_hash' => hash('sha256', $token),
        ]);

        return redirect()->away($target->ssoLoginUrl($token, impersonation: true));
    }
}
