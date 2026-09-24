<?php

namespace App\Http\Controllers\App;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\AccountUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

// (self-hosted: chỉ bước account_details; inbox_setup là bước cloud-only).
class OnboardingsController extends Controller
{
    private const CUSTOM_ATTRIBUTE_KEYS = ['website', 'industry', 'company_size', 'timezone', 'referral_source', 'user_role'];

    public function show(Request $request, Account $account): RedirectResponse|Response
    {
        $this->abortUnlessAdministratorPage($request);

        if ($account->onboardingStep() !== 'account_details') {
            return redirect("/app/accounts/{$account->id}/dashboard");
        }

        return Inertia::render('dashboard/onboarding/Index', [
            'account' => $account->only(['id', 'name', 'locale', 'custom_attributes']),
            'languages' => config('yona.available_locales'),
        ]);
    }

    public function update(Request $request, Account $account): RedirectResponse
    {
        $this->abortUnlessAdministratorPage($request);

        // Chỉ xử lý khi con trỏ onboarding còn ở bước này — replay cũ thành no-op.
        if ($account->onboardingStep() !== 'account_details') {
            return redirect("/app/accounts/{$account->id}/dashboard");
        }

        // Website không bắt buộc: bản gốc đòi nó để tạo inbox web-widget ở bước
        // inbox_setup, bước mà bản này không chạy — và phần lớn shop chỉ bán qua chat.
        $accountParams = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'locale' => ['nullable', 'string', Rule::in(array_column(config('yona.available_locales'), 'iso_639_1_code'))],
            'website' => ['nullable', 'string', 'max:255'],
            'industry' => ['nullable', 'string', 'max:255'],
            'company_size' => ['nullable', 'string', 'max:255'],
            // Trình duyệt có thể gửi tên cũ (Asia/Saigon) thay cho tên hiện hành (Asia/Ho_Chi_Minh).
            'timezone' => ['nullable', 'string', 'timezone:all_with_bc'],
            'referral_source' => ['nullable', 'string', 'max:255'],
            'user_role' => ['nullable', 'string', 'max:255'],
        ]);

        $account->fill(array_filter([
            'name' => $accountParams['name'] ?? null,
            'locale' => $accountParams['locale'] ?? null,
        ], fn ($value) => $value !== null));

        $account->custom_attributes = [
            ...$account->custom_attributes,
            ...array_filter(
                array_intersect_key($accountParams, array_flip(self::CUSTOM_ATTRIBUTE_KEYS)),
                fn ($value) => $value !== null,
            ),
        ];
        $account->save();

        $account->finishOnboarding();

        return redirect("/app/accounts/{$account->id}/dashboard");
    }

    // Trang onboarding trả 404/403 (mặt tiền web), khác 401 JSON của web_api.
    private function abortUnlessAdministratorPage(Request $request): void
    {
        $accountUser = $request->attributes->get('currentAccountUser');

        abort_unless($accountUser instanceof AccountUser, 404);
        abort_unless($accountUser->role === AccountUser::ROLE_ADMINISTRATOR, 403);
    }
}
