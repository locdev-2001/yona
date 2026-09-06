<?php

namespace App\Services\Mfa;

use App\Models\User;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;

// Port app/services/mfa/token_service.rb — token ngắn hạn nối bước "mật khẩu đúng"
// với bước "nhập mã OTP" mà không cần tạo phiên đăng nhập ở giữa.
// Chatwoot ký JWT bằng SECRET_KEY_BASE; ở đây dùng encrypter của Laravel (APP_KEY).
class TokenService
{
    public const TOKEN_EXPIRY_MINUTES = 5;

    public function generateToken(User $user): string
    {
        return Crypt::encryptString(json_encode([
            'user_id' => $user->id,
            'exp' => now()->addMinutes(self::TOKEN_EXPIRY_MINUTES)->getTimestamp(),
        ], JSON_THROW_ON_ERROR));
    }

    public function verifyToken(?string $token): ?User
    {
        if (! $token) {
            return null;
        }

        try {
            $payload = json_decode(Crypt::decryptString($token), true, 512, JSON_THROW_ON_ERROR);
        } catch (DecryptException|\JsonException) {
            return null;
        }

        if (! is_array($payload) || ($payload['exp'] ?? 0) < now()->getTimestamp()) {
            return null;
        }

        return User::query()->find($payload['user_id'] ?? null);
    }
}
