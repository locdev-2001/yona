<?php

use App\Models\User;
use App\Services\Mfa\TokenService;
use Illuminate\Support\Facades\Crypt;

// JWT ký bằng encrypter APP_KEY của Laravel.

it('round trips a token back to its user', function () {
    $user = User::factory()->create();
    $service = new TokenService;

    expect($service->verifyToken($service->generateToken($user))->id)->toBe($user->id);
});

it('returns null for a malformed token', function () {
    expect((new TokenService)->verifyToken('invalid_token'))->toBeNull();
});

it('returns null for a null token', function () {
    expect((new TokenService)->verifyToken(null))->toBeNull();
});

it('returns null for an expired token', function () {
    $user = User::factory()->create();
    $expired = Crypt::encryptString(json_encode([
        'user_id' => $user->id,
        'exp' => now()->subMinute()->getTimestamp(),
    ]));

    expect((new TokenService)->verifyToken($expired))->toBeNull();
});

it('returns null when the user no longer exists', function () {
    $token = Crypt::encryptString(json_encode([
        'user_id' => 999999,
        'exp' => now()->addMinutes(5)->getTimestamp(),
    ]));

    expect((new TokenService)->verifyToken($token))->toBeNull();
});

it('expires exactly five minutes after issuing', function () {
    $user = User::factory()->create();
    $token = (new TokenService)->generateToken($user);

    $payload = json_decode(Crypt::decryptString($token), true);
    expect($payload['exp'])->toBe(now()->addMinutes(TokenService::TOKEN_EXPIRY_MINUTES)->getTimestamp());
});
