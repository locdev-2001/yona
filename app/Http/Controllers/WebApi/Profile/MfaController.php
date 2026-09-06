<?php

namespace App\Http\Controllers\WebApi\Profile;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Mfa\AuthenticationService;
use App\Services\Mfa\ManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

// Port api/v1/profile/mfa_controller.rb + view jbuilder tương ứng.
class MfaController extends Controller implements HasMiddleware
{
    // Tương đương before_action :check_mfa_feature_available của bản gốc.
    public static function middleware(): array
    {
        return [
            function (Request $request, \Closure $next) {
                if (! config('yona.mfa_enabled')) {
                    return response()->json(
                        ['error' => __('errors.mfa.feature_unavailable')],
                        Response::HTTP_FORBIDDEN,
                    );
                }

                return $next($request);
            },
        ];
    }

    public function show(Request $request): JsonResponse
    {
        $service = $this->service($request);

        return response()->json([
            'feature_available' => true,
            'enabled' => $request->user()->mfaEnabled(),
            'backup_codes_generated' => $service->backupCodesGenerated(),
            'remaining_backup_codes' => $service->remainingBackupCodesCount(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if ($request->user()->mfaEnabled()) {
            return $this->error(__('errors.mfa.already_enabled'));
        }

        $service = $this->service($request);
        $service->enableTwoFactor();

        return response()->json([
            'provisioning_url' => $service->twoFactorProvisioningUri(),
            'secret' => $request->user()->otp_secret,
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        if ($request->user()->mfaEnabled()) {
            return $this->error(__('errors.mfa.already_enabled'));
        }

        if (! $this->authenticated($request)) {
            return $this->error(__('errors.mfa.invalid_code'));
        }

        $backupCodes = $this->service($request)->verifyAndActivate();

        return response()->json(array_filter([
            'enabled' => $request->user()->mfaEnabled(),
            'backup_codes' => $backupCodes,
        ], fn ($value): bool => $value !== null));
    }

    public function destroy(Request $request): JsonResponse
    {
        if (! $request->user()->mfaEnabled()) {
            return $this->error(__('errors.mfa.not_enabled'));
        }

        if (! Hash::check((string) $request->input('password'), $request->user()->password)) {
            return $this->error(__('errors.mfa.invalid_credentials'));
        }

        if (! $this->authenticated($request)) {
            return $this->error(__('errors.mfa.invalid_code'));
        }

        $this->service($request)->disableTwoFactor();

        return response()->json(['enabled' => $request->user()->mfaEnabled()]);
    }

    public function backupCodes(Request $request): JsonResponse
    {
        if (! $request->user()->mfaEnabled()) {
            return $this->error(__('errors.mfa.not_enabled'));
        }

        if (! $this->authenticated($request)) {
            return $this->error(__('errors.mfa.invalid_code'));
        }

        return response()->json(['backup_codes' => $this->service($request)->generateBackupCodes()]);
    }

    private function service(Request $request): ManagementService
    {
        return new ManagementService($this->user($request));
    }

    private function user(Request $request): User
    {
        return $request->user();
    }

    private function authenticated(Request $request): bool
    {
        return (new AuthenticationService(
            $this->user($request),
            $request->input('otp_code'),
            $request->input('backup_code'),
        ))->authenticate();
    }

    private function error(string $message): JsonResponse
    {
        return response()->json(['error' => $message], Response::HTTP_UNPROCESSABLE_ENTITY);
    }
}
