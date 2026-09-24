<?php

namespace App\Http\Controllers\Api\Webhooks\Concerns;

use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Hai cửa xác thực của Meta: `hub.verify_token` lúc đăng ký, `X-Hub-Signature-256`
 * cho mỗi payload.
 */
trait VerifiesMetaSignature
{
    /** @param list<string|null> $appSecrets */
    protected function hasValidMetaSignature(Request $request, array $appSecrets): bool
    {
        $header = $request->header('X-Hub-Signature-256');

        if (blank($header)) {
            return false;
        }

        foreach (array_filter($appSecrets) as $secret) {
            $expected = 'sha256='.hash_hmac('sha256', $request->getContent(), $secret);

            if (hash_equals($expected, $header)) {
                return true;
            }
        }

        return false;
    }

    /** @param list<string|null> $validTokens */
    protected function verifyChallenge(Request $request, array $validTokens): Response
    {
        $token = $request->query('hub_verify_token', $request->query('hub.verify_token'));
        $challenge = $request->query('hub_challenge', $request->query('hub.challenge'));

        foreach (array_filter($validTokens) as $validToken) {
            if ($token === $validToken) {
                return response((string) $challenge);
            }
        }

        return response('', 401);
    }
}
