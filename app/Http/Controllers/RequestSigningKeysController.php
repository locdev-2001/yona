<?php

namespace App\Http\Controllers;

use App\Http\RequestSigning\ProtectedRoutes;
use App\Http\RequestSigning\SigningKeyStore;
use App\Http\RequestSigning\SigningSubjects;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

// Cấp khoá phiên cho client (dashboard, widget) lúc khởi động và mỗi khi máy chủ trả 428.
// Mỗi lần gọi là một khoá mới; khoá cũ tự hết hạn hoặc bị thu hồi khi đăng nhập/đăng xuất.
class RequestSigningKeysController extends Controller
{
    public function __construct(
        private readonly SigningKeyStore $keys,
        private readonly SigningSubjects $subjects,
        private readonly ProtectedRoutes $protectedRoutes,
    ) {}

    public function store(Request $request, string $surface): JsonResponse
    {
        $subject = $this->subjects->for($surface);

        if (! config('request_protection.signing.enabled') || $subject->exempt($request)) {
            return $this->noStore(['enabled' => false]);
        }

        $identity = $subject->identify($request);
        abort_if($identity === null, 404, 'Resource could not be found');

        $key = $this->keys->issue($identity);

        return $this->noStore([
            'enabled' => true,
            'key_id' => $key->id,
            'encryption_key' => base64_encode($key->encryptionKey),
            'signing_key' => base64_encode($key->signingKey),
            'expires_at' => $key->expiresAt,
            'server_time' => now()->getTimestamp(),
            'protected_routes' => $this->protectedRoutes->for($surface),
        ]);
    }

    /** @param array<string, mixed> $body */
    private function noStore(array $body): JsonResponse
    {
        return response()->json($body)->header('Cache-Control', 'no-store');
    }
}
