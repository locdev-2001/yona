<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Concerns\MfaEnrollmentActions;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

// JSON dùng bởi màn cài đặt 2FA của console (superadmin/pages/MfaSetup.tsx).
// Logic bật/tắt dùng chung với WebApi\Profile\MfaController qua MfaEnrollmentActions;
// khác biệt duy nhất là user lấy từ guard `super_admin`.
class MfaController extends Controller
{
    use MfaEnrollmentActions;

    public function setupPage(Request $request): RedirectResponse|Response
    {
        if ($this->currentUser($request)->mfaEnabled()) {
            return redirect('/super_admin');
        }

        return Inertia::render('superadmin/MfaSetup');
    }

    protected function currentUser(Request $request): User
    {
        return Auth::guard('super_admin')->user();
    }
}
