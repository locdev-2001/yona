<?php

namespace App\Http\Controllers\Platform\Api\V1;

use App\Http\Resources\Platform\PlatformAccountResource;
use App\Jobs\DeleteObjectJob;
use App\Models\Account;
use App\Models\PlatformAppPermissible;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Port từ refs/chatwoot/app/controllers/platform/api/v1/accounts_controller.rb.
class AccountsController extends PlatformController
{
    public function index(Request $request): JsonResponse
    {
        $accounts = $this->platformApp($request)->platformAppPermissibles()
            ->where('permissible_type', 'Account')
            ->with('permissible')
            ->get()
            ->map(fn (PlatformAppPermissible $permissible) => $permissible->permissible)
            ->filter()
            ->map(fn (Account $account) => PlatformAccountResource::toArray($account))
            ->values();

        return response()->json($accounts);
    }

    public function show(Request $request, Account $account): JsonResponse
    {
        return $this->denyUnlessPermissible($request, $account)
            ?? response()->json(PlatformAccountResource::toArray($account));
    }

    public function store(Request $request): JsonResponse
    {
        $account = new Account;
        $this->assignAttributes($account, $request);
        $account->save();

        $this->platformApp($request)->permit($account);

        return response()->json(PlatformAccountResource::toArray($account));
    }

    public function update(Request $request, Account $account): JsonResponse
    {
        if ($denied = $this->denyUnlessPermissible($request, $account)) {
            return $denied;
        }

        $this->assignAttributes($account, $request);
        $account->save();

        return response()->json(PlatformAccountResource::toArray($account));
    }

    public function destroy(Request $request, Account $account): JsonResponse
    {
        if ($denied = $this->denyUnlessPermissible($request, $account)) {
            return $denied;
        }

        DeleteObjectJob::dispatch($account);

        return response()->json([]);
    }

    private function assignAttributes(Account $account, Request $request): void
    {
        $attributes = $request->only(['name', 'locale', 'domain', 'support_email', 'custom_attributes', 'limits']);

        foreach ($attributes as $key => $value) {
            $account->{$key} = $value;
        }

        if ($request->has('status')) {
            $account->status = $request->input('status') === 'suspended' ? Account::STATUS_SUSPENDED : Account::STATUS_ACTIVE;
        }

        $this->updateFeatures($account, $request->input('features'));
    }

    // update_resource_features — mỗi khóa truthy bật cờ, falsy tắt cờ.
    private function updateFeatures(Account $account, mixed $features): void
    {
        if (blank($features) || ! is_array($features)) {
            return;
        }

        $flags = $account->feature_flags ?? [];

        foreach ($features as $key => $value) {
            $flags[$key] = filled($value) && $value !== false && $value !== 'false';
        }

        $account->feature_flags = $flags;
    }
}
