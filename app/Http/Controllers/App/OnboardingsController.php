<?php

namespace App\Http\Controllers\App;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\AccountUser;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

// Port từ refs/chatwoot/app/controllers/api/v1/accounts/onboardings_controller.rb
// (self-hosted: chỉ bước account_details; inbox_setup là bước cloud-only).
class OnboardingsController extends Controller
{
    public function show(Request $request, Account $account): RedirectResponse|Response
    {
        $this->authorizeAdministrator($request, $account);

        if ($account->onboardingStep() !== 'account_details') {
            return redirect("/app/accounts/{$account->id}/dashboard");
        }

        return Inertia::render('dashboard/onboarding/Index', [
            'account' => $account->only(['id', 'name', 'locale', 'custom_attributes']),
        ]);
    }

    public function update(Request $request, Account $account): RedirectResponse
    {
        $this->authorizeAdministrator($request, $account);

        // Chỉ xử lý khi con trỏ onboarding còn ở bước này — replay cũ thành no-op.
        if ($account->onboardingStep() !== 'account_details') {
            return redirect("/app/accounts/{$account->id}/dashboard");
        }

        $accountParams = $request->validate([
            'name' => ['nullable', 'string'],
            'locale' => ['nullable', 'string', 'max:10'],
            'website' => ['required', 'string'],
            'industry' => ['nullable', 'string'],
            'company_size' => ['nullable', 'string'],
            'timezone' => ['nullable', 'string'],
            'referral_source' => ['nullable', 'string'],
            'user_role' => ['nullable', 'string'],
        ]);

        $account->fill(array_filter([
            'name' => $accountParams['name'] ?? null,
            'locale' => $accountParams['locale'] ?? null,
        ], fn ($value) => $value !== null));

        $account->custom_attributes = [
            ...$account->custom_attributes,
            ...array_filter([
                'website' => $accountParams['website'],
                'industry' => $accountParams['industry'] ?? null,
                'company_size' => $accountParams['company_size'] ?? null,
                'timezone' => $accountParams['timezone'] ?? null,
                'referral_source' => $accountParams['referral_source'] ?? null,
                'user_role' => $accountParams['user_role'] ?? null,
            ], fn ($value) => $value !== null),
        ];
        $account->save();

        $account->finishOnboarding();

        return redirect("/app/accounts/{$account->id}/dashboard");
    }

    private function authorizeAdministrator(Request $request, Account $account): void
    {
        $accountUser = $request->attributes->get('currentAccountUser');

        abort_unless($accountUser instanceof AccountUser, 404);
        abort_unless($accountUser->role === AccountUser::ROLE_ADMINISTRATOR, 403);
    }
}
