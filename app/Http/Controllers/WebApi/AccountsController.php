<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Http\Resources\AccountResource;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Port từ Api::V1::AccountsController (nhánh show + update).
 *
 * `create` đã nằm ở Auth\RegistrationsController (A2); `cache_keys`,
 * `update_active_at` và khối billing chưa port.
 */
class AccountsController extends Controller
{
    private const ATTRIBUTE_RULES = [
        'name' => ['sometimes', 'string', 'max:255'],
        'locale' => ['sometimes', 'string', 'max:20'],
        'domain' => ['sometimes', 'nullable', 'string', 'max:100'],
        'support_email' => ['sometimes', 'nullable', 'email', 'max:100'],
    ];

    // permitted_settings_attributes + account_settings_schema.rb.
    private const SETTINGS_RULES = [
        'auto_resolve_after' => ['sometimes', 'nullable', 'integer', 'between:10,1439856'],
        'auto_resolve_message' => ['sometimes', 'nullable', 'string'],
        'auto_resolve_ignore_waiting' => ['sometimes', 'nullable', 'boolean'],
        'auto_resolve_label' => ['sometimes', 'nullable', 'string'],
        'audio_transcriptions' => ['sometimes', 'nullable', 'boolean'],
    ];

    private const CUSTOM_ATTRIBUTE_RULES = [
        'industry' => ['sometimes', 'nullable', 'string'],
        'company_size' => ['sometimes', 'nullable', 'string'],
        'timezone' => ['sometimes', 'nullable', 'string'],
        'referral_source' => ['sometimes', 'nullable', 'string'],
        'user_role' => ['sometimes', 'nullable', 'string'],
        'website' => ['sometimes', 'nullable', 'string'],
    ];

    public function show(Request $request, Account $account): JsonResponse
    {
        return response()->json(new AccountResource($account));
    }

    public function update(Request $request, Account $account): JsonResponse
    {
        $this->authorizeAdministrator($request);

        $data = $request->validate([
            ...self::ATTRIBUTE_RULES,
            ...self::SETTINGS_RULES,
            ...self::CUSTOM_ATTRIBUTE_RULES,
        ]);

        $account->fill(collect($data)->only(array_keys(self::ATTRIBUTE_RULES))->all());

        $customAttributes = collect($data)->only(array_keys(self::CUSTOM_ATTRIBUTE_RULES))->all();
        $settings = collect($data)->only(array_keys(self::SETTINGS_RULES))->all();

        $account->custom_attributes = [...($account->custom_attributes ?? []), ...$customAttributes];
        $account->settings = [...($account->settings ?? []), ...$settings];

        // Onboarding: cập nhật account xong thì bước kế tiếp là mời đồng đội.
        if (($account->custom_attributes[Account::ONBOARDING_STEP_KEY] ?? null) === 'account_update') {
            $account->custom_attributes = [
                ...$account->custom_attributes,
                Account::ONBOARDING_STEP_KEY => 'invite_team',
            ];
        }

        $account->save();

        return response()->json(new AccountResource($account));
    }
}
