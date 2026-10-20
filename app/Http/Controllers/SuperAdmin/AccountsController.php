<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Jobs\DeleteObjectJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;
use App\Services\Admin\Operations\AccountSuspension;
use App\Support\SuperAdmin\Dashboard;
use App\Support\SuperAdmin\Dashboards\AccountDashboard;
use App\Support\SuperAdminArea;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
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

    protected function indexQuery(): Builder
    {
        return parent::indexQuery()->personal();
    }

    // Danh sách account mở thẳng account 360; trang show cũ vẫn có nút từ đó.
    protected function indexRowUrl(Model $record): ?string
    {
        return SuperAdminArea::url("accounts/{$record->getKey()}/overview");
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

    // Khoá nhanh từ account 360: cùng luật lý do + nhóm lý do như biểu mẫu sửa.
    public function suspend(Request $request, int $id, AccountSuspension $suspension): RedirectResponse
    {
        $data = $request->validate([
            'category' => ['required', 'string', Rule::in(AccountSuspension::categories())],
            'reason' => ['required', 'string', 'max:'.AccountSuspension::MAX_REASON_LENGTH],
        ]);

        $account = Account::query()->findOrFail($id);
        $suspension->suspend($account, $data['category'], trim($data['reason']));
        $account->save();

        return back()->with('notice', __('admin_operations.SUSPENSION.SUSPENDED', ['name' => $account->name]));
    }

    public function unsuspend(int $id, AccountSuspension $suspension): RedirectResponse
    {
        $account = Account::query()->findOrFail($id);
        $suspension->unsuspend($account);
        $account->save();

        return back()->with('notice', __('admin_operations.SUSPENSION.UNSUSPENDED', ['name' => $account->name]));
    }

    // Chuyển sang trạng thái suspended bắt buộc có lý do + nhóm lý do; ghi mốc
    // lịch sử do AccountSuspension lo.
    private function applyStatus(Account $account, array $payload): void
    {
        $target = (string) $payload['status'];

        if ($target !== 'suspended') {
            app(AccountSuspension::class)->unsuspend($account);

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

        if (mb_strlen($reason) > AccountSuspension::MAX_REASON_LENGTH) {
            throw ValidationException::withMessages(['account.suspension_reason' => ['Suspension reason is too long (maximum is 256 characters)']]);
        }

        app(AccountSuspension::class)->suspend($account, $category, $reason);
    }
}
