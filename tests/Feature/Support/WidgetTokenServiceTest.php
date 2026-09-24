<?php

use App\Support\Jwt;
use App\Support\WidgetTokenService;

it('round trips the payload it was given', function () {
    $token = WidgetTokenService::generate(['source_id' => 'abc', 'inbox_id' => 7]);

    expect(WidgetTokenService::decode($token))->toMatchArray(['source_id' => 'abc', 'inbox_id' => 7]);
});

it('stamps iat and an expiry of the configured number of days', function () {
    config(['yona.widget_token_expiry_days' => 30]);

    $claims = WidgetTokenService::decode(WidgetTokenService::generate([]));

    expect($claims['exp'] - $claims['iat'])->toBe(30 * 86400);
});

it('defaults to 180 days', function () {
    config(['yona.widget_token_expiry_days' => null]);

    $claims = WidgetTokenService::decode(WidgetTokenService::generate([]));

    expect($claims['exp'] - $claims['iat'])->toBe(WidgetTokenService::DEFAULT_EXPIRY_DAYS * 86400);
});

it('returns nothing for a blank, malformed, tampered or expired token', function (?string $token) {
    expect(WidgetTokenService::decode($token))->toBe([]);
})->with([
    'blank' => [null],
    'empty' => [''],
    'garbage' => ['invalid token'],
    'wrong signature' => [fn () => Jwt::encode(['source_id' => 'abc'], 'another-secret')],
    'expired' => [fn () => Jwt::encode(['source_id' => 'abc', 'exp' => time() - 1], (string) config('app.key'))],
]);

it('does not accept a token signed with the algorithm swapped to none', function () {
    $header = rtrim(strtr(base64_encode('{"alg":"none","typ":"JWT"}'), '+/', '-_'), '=');
    $payload = rtrim(strtr(base64_encode('{"source_id":"abc"}'), '+/', '-_'), '=');

    expect(WidgetTokenService::decode("{$header}.{$payload}."))->toBe([]);
});
