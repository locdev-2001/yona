<?php

namespace App\Http\Controllers\WebApi\Profile;

use App\Http\Controllers\Concerns\MfaEnrollmentActions;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

// Port api/v1/profile/mfa_controller.rb + view jbuilder tương ứng.
class MfaController extends Controller
{
    use MfaEnrollmentActions;

    protected function currentUser(Request $request): User
    {
        return $request->user();
    }
}
