<?php

namespace App\Http\Controllers\WebApi;

use App\Http\Controllers\Controller;
use App\Services\Email\Verification\EmailAddressVerifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Kiểm trước khi soạn thư tới một địa chỉ mới: đúng cú pháp và tên miền nhận thư.
class EmailAddressesController extends Controller
{
    public function verify(Request $request, EmailAddressVerifier $verifier): JsonResponse
    {
        $validated = $request->validate(['email' => ['required', 'string', 'max:320']]);

        return response()->json($verifier->verify($validated['email'])->toArray());
    }
}
