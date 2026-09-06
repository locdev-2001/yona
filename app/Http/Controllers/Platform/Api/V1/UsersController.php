<?php

namespace App\Http\Controllers\Platform\Api\V1;

use App\Http\Resources\Platform\PlatformUserResource;
use App\Jobs\DeleteObjectJob;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Port từ refs/chatwoot/app/controllers/platform/api/v1/users_controller.rb.
class UsersController extends PlatformController
{
    public function show(Request $request, User $user): JsonResponse
    {
        return $this->denyUnlessPermissible($request, $user)
            ?? response()->json(PlatformUserResource::toArray($user));
    }

    public function store(Request $request): JsonResponse
    {
        $attributes = $request->only(['name', 'display_name', 'email', 'password', 'custom_attributes']);
        $user = User::fromEmail($attributes['email'] ?? null);

        if ($user === null) {
            $this->validatePassword($request);

            $user = new User($attributes);
            // skip_confirmation! — tài khoản do platform tạo không cần xác nhận email.
            $user->confirmed_at = now();
            $user->save();
        }

        $this->platformApp($request)->permit($user);

        return response()->json(PlatformUserResource::toArray($user));
    }

    public function update(Request $request, User $user): JsonResponse
    {
        if ($denied = $this->denyUnlessPermissible($request, $user)) {
            return $denied;
        }

        if ($request->filled('password')) {
            $this->validatePassword($request);
        }

        $user->fill($request->only(['name', 'display_name', 'email', 'password']));

        if ($request->has('custom_attributes')) {
            $user->custom_attributes = array_merge($user->custom_attributes ?? [], (array) $request->input('custom_attributes'));
        }

        $user->save();

        return response()->json(PlatformUserResource::toArray($user));
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($denied = $this->denyUnlessPermissible($request, $user)) {
            return $denied;
        }

        DeleteObjectJob::dispatch($user);

        return response()->json([]);
    }

    // GET /users/{id}/login — trả link đăng nhập một lần (generate_sso_link).
    public function login(Request $request, User $user): JsonResponse
    {
        return $this->denyUnlessPermissible($request, $user)
            ?? response()->json(['url' => $user->generateSsoLink()]);
    }

    // POST /users/{id}/token — token Application API của chính user đó.
    public function token(Request $request, User $user): JsonResponse
    {
        return $this->denyUnlessPermissible($request, $user)
            ?? response()->json(PlatformUserResource::tokenPayload($user));
    }

    private function validatePassword(Request $request): void
    {
        $request->validate(['password' => User::passwordRules()]);
    }
}
