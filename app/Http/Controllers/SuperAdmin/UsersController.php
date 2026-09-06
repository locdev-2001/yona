<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;
use App\Support\SuperAdmin\Dashboard;
use App\Support\SuperAdmin\Dashboards\UserDashboard;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

// Port từ refs/chatwoot/app/controllers/super_admin/users_controller.rb.
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
            'impersonateUrl' => "/super_admin/users/{$record->getKey()}/impersonate",
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
        $this->findRecord($id)->avatar?->delete();

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
    public function impersonate(int $id): RedirectResponse
    {
        return redirect()->away($this->findRecord($id)->generateSsoLink(impersonation: true));
    }
}
