<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Concerns\MfaEnrollmentActions;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

// Dash #39: JSON dùng bởi màn cài đặt 2FA của console (superadmin/pages/MfaSetup.tsx).
// Logic bật/tắt dùng chung với WebApi\Profile\MfaController qua MfaEnrollmentActions;
// khác biệt duy nhất là user lấy từ guard `super_admin`.
class MfaController extends Controller
{
    use MfaEnrollmentActions;

    public function setupPage(Request $request): Response
    {
        $superAdmin = $this->currentUser($request);

        return Inertia::render('superadmin/MfaSetup', [
            'mfaEnabled' => $superAdmin->mfaEnabled(),
        ]);
    }

    protected function currentUser(Request $request): User
    {
        return Auth::guard('super_admin')->user();
    }
}
