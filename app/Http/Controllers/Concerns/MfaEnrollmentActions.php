<?php

namespace App\Http\Controllers\Concerns;

use App\Models\User;
use App\Services\Mfa\AuthenticationService;
use App\Services\Mfa\ManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

trait MfaEnrollmentActions
{
    abstract protected function currentUser(Request $request): User;

    public function show(Request $request): JsonResponse
    {
        $user = $this->currentUser($request);
        $service = new ManagementService($user);

        return response()->json([
            'feature_available' => true,
            'enabled' => $user->mfaEnabled(),
            'backup_codes_generated' => $service->backupCodesGenerated(),
            'remaining_backup_codes' => $service->remainingBackupCodesCount(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $this->currentUser($request);

        if ($user->mfaEnabled()) {
            return $this->mfaError(__('errors.mfa.already_enabled'));
        }

        $service = new ManagementService($user);
        $service->enableTwoFactor();

        return response()->json([
            'provisioning_url' => $service->twoFactorProvisioningUri(),
            'secret' => $user->otp_secret,
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        $user = $this->currentUser($request);

        if ($user->mfaEnabled()) {
            return $this->mfaError(__('errors.mfa.already_enabled'));
        }

        if (! $this->mfaAuthenticated($request, $user)) {
            return $this->mfaError(__('errors.mfa.invalid_code'));
        }

        $backupCodes = (new ManagementService($user))->verifyAndActivate();

        return response()->json(array_filter([
            'enabled' => $user->mfaEnabled(),
            'backup_codes' => $backupCodes,
        ], fn ($value): bool => $value !== null));
    }

    public function destroy(Request $request): JsonResponse
    {
        $user = $this->currentUser($request);

        if (! $user->mfaEnabled()) {
            return $this->mfaError(__('errors.mfa.not_enabled'));
        }

        if (! Hash::check((string) $request->input('password'), $user->password)) {
            return $this->mfaError(__('errors.mfa.invalid_credentials'));
        }

        if (! $this->mfaAuthenticated($request, $user)) {
            return $this->mfaError(__('errors.mfa.invalid_code'));
        }

        (new ManagementService($user))->disableTwoFactor();

        return response()->json(['enabled' => $user->mfaEnabled()]);
    }

    public function backupCodes(Request $request): JsonResponse
    {
        $user = $this->currentUser($request);

        if (! $user->mfaEnabled()) {
            return $this->mfaError(__('errors.mfa.not_enabled'));
        }

        if (! $this->mfaAuthenticated($request, $user)) {
            return $this->mfaError(__('errors.mfa.invalid_code'));
        }

        return response()->json(['backup_codes' => (new ManagementService($user))->generateBackupCodes()]);
    }

    private function mfaAuthenticated(Request $request, User $user): bool
    {
        return (new AuthenticationService(
            $user,
            $request->input('otp_code'),
            $request->input('backup_code'),
        ))->authenticate();
    }

    private function mfaError(string $message): JsonResponse
    {
        return response()->json(['error' => $message], Response::HTTP_UNPROCESSABLE_ENTITY);
    }
}
