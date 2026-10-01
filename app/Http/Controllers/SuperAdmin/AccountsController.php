<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Jobs\DeleteObjectJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;
use App\Support\SuperAdmin\Dashboard;
use App\Support\SuperAdmin\Dashboards\AccountDashboard;
use App\Support\SuperAdminArea;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AccountsController extends ResourceController
{
    protected function dashboard(): Dashboard
    {
        return app(AccountDashboard::class);
    }

    protected function showProps(Model $record): array
    {
        return [
            'accountUserForm' => [
                'accountId' => $record->getKey(),
                'users' => User::query()->orderByDesc('id')->get(['id', 'name', 'email'])
                    ->map(fn (User $user) => ['value' => $user->id, 'label' => "#{$user->id} {$user->name}"])->all(),
                'roles' => array_values(AccountUser::ROLE_NAMES),
            ],
        ];
    }

    protected function assign(Model $record, Request $request): void
    {
        $payload = (array) $request->input('account', []);

        $record->name = $payload['name'] ?? $record->name;
        $record->locale = $payload['locale'] ?? $record->locale;

        if (array_key_exists('status', $payload)) {
            $this->applyStatus($record, $payload);
        }
    }

    // Xoá account chạy nền như bản gốc (DeleteObjectJob) vì kéo theo cả cây dữ liệu.
    public function destroy(int $id): RedirectResponse
    {
        DeleteObjectJob::dispatch($this->findRecord($id));

        return redirect(SuperAdminArea::url('accounts'))->with('notice', 'Account deletion is in progress.');
    }

    public function resetCache(int $id): RedirectResponse
    {
        $this->findRecord($id)->touch();

        return back()->with('notice', 'Cache keys cleared');
    }

    // validate_suspension_metadata + apply_suspension_metadata của bản gốc:
    // chuyển sang trạng thái suspended bắt buộc có lý do + nhóm lý do, và mỗi
    // lần đình chỉ ghi thêm một mốc vào internal_attributes.suspensions.
    private function applyStatus(Account $account, array $payload): void
    {
        $target = (string) $payload['status'];

        if ($target !== 'suspended') {
            $account->status = Account::STATUS_ACTIVE;

            return;
        }

        $category = trim((string) ($payload['suspension_category'] ?? ''));
        $reason = trim((string) ($payload['suspension_reason'] ?? ''));

        if ($category === '' || $reason === '') {
            throw ValidationException::withMessages([
                'account.suspension_category' => $category === '' ? ['Suspension category is required'] : [],
                'account.suspension_reason' => $reason === '' ? ['Suspension reason is required'] : [],
            ]);
        }

        if (mb_strlen($reason) > 256) {
            throw ValidationException::withMessages(['account.suspension_reason' => ['Suspension reason is too long (maximum is 256 characters)']]);
        }

        $internal = $account->internal_attributes ?? [];
        $history = $internal['suspensions'] ?? [];
        $event = ['category' => $category, 'reason' => $reason];

        if ($account->status === Account::STATUS_ACTIVE) {
            $history[] = [...$event, 'suspended_at' => now()->toIso8601String()];
        } elseif ($history === []) {
            $history[] = [...$event, 'suspended_at' => now()->toIso8601String()];
        } else {
            $history[count($history) - 1] = [...$history[count($history) - 1], ...$event];
        }

        $account->internal_attributes = [...$internal, 'suspensions' => $history];
        $account->status = Account::STATUS_SUSPENDED;
    }
}
