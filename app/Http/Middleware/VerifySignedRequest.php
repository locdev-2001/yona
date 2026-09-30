<?php

namespace App\Http\Middleware;

use App\Http\RequestSigning\RequestBody;
use App\Http\RequestSigning\SignedRequestProtocol as Protocol;
use App\Http\RequestSigning\SigningKey;
use App\Http\RequestSigning\SigningKeyStore;
use App\Http\RequestSigning\SigningSubjects;
use Closure;
use Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull;
use Illuminate\Foundation\Http\Middleware\TrimStrings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pipeline\Pipeline;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Cửa duy nhất giải mã + kiểm chữ ký cho endpoint nhắn tin gọi từ trình duyệt; lõi phía sau
 * nhận request như JSON/form thường. Mục tiêu là chống dựng request bằng tay, replay và script
 * gọi hàng loạt, không phải giấu nội dung khỏi máy chủ; luôn đi kèm giới hạn nhịp.
 *
 * 428: thiếu/hết hạn khoá hoặc lệch giờ, client xin khoá mới (đồng bộ lại giờ) rồi gửi lại một lần.
 * 400: chữ ký sai, thân bị sửa, thân chưa mã hoá. 409: nonce dùng lại (replay).
 */
class VerifySignedRequest
{
    public const KEY_REQUIRED = 'request_signing_key_required';

    public const SIGNATURE_INVALID = 'request_signature_invalid';

    public const NONCE_REUSED = 'request_nonce_reused';

    public function __construct(
        private readonly SigningKeyStore $keys,
        private readonly SigningSubjects $subjects,
    ) {}

    public function handle(Request $request, Closure $next, string $surface): Response
    {
        $subject = $this->subjects->for($surface);

        if (! config('request_protection.signing.enabled') || $subject->exempt($request)) {
            return $next($request);
        }

        $keyId = (string) $request->header(Protocol::HEADER_KEY_ID, '');
        $timestamp = (string) $request->header(Protocol::HEADER_TIMESTAMP, '');
        $nonce = (string) $request->header(Protocol::HEADER_NONCE, '');
        $signature = (string) $request->header(Protocol::HEADER_SIGNATURE, '');

        if ($keyId === '' || $nonce === '' || $signature === '' || ! ctype_digit($timestamp)) {
            return $this->reject($request, $surface, 428, self::KEY_REQUIRED, 'missing_headers');
        }

        if (abs(now()->getTimestamp() - (int) $timestamp) > (int) config('request_protection.signing.max_clock_skew_seconds')) {
            return $this->reject($request, $surface, 428, self::KEY_REQUIRED, 'clock_skew');
        }

        $key = $this->keys->find($keyId);

        if ($key === null || $key->expiresAt < now()->getTimestamp() || $key->subject !== $subject->identify($request)) {
            return $this->reject($request, $surface, 428, self::KEY_REQUIRED, 'unknown_key');
        }

        $canonical = Protocol::canonical($request->getRealMethod(), $request->getRequestUri(), $timestamp, $nonce, RequestBody::digest($request));

        if (! hash_equals(Protocol::sign($key->signingKey, $canonical), strtolower($signature))) {
            return $this->reject($request, $surface, 400, self::SIGNATURE_INVALID, 'bad_signature');
        }

        if (! $this->keys->claimNonce($key->id, $nonce)) {
            return $this->reject($request, $surface, 409, self::NONCE_REUSED, 'nonce_reused');
        }

        if (! $this->decryptInto($request, $key)) {
            return $this->reject($request, $surface, 400, self::SIGNATURE_INVALID, 'unencrypted_or_corrupt_payload');
        }

        return (new Pipeline(app()))
            ->send($request)
            ->through([TrimStrings::class, ConvertEmptyStringsToNull::class])
            ->then($next);
    }

    // Thân phải là phong bì mã hoá (hoặc rỗng): dán lại một thân JSON trơn bằng tay không qua được.
    private function decryptInto(Request $request, SigningKey $key): bool
    {
        if (RequestBody::isForm($request)) {
            $plainFields = $request->request->all();
            $envelope = $plainFields[Protocol::ENCRYPTED_FIELD] ?? null;
            unset($plainFields[Protocol::ENCRYPTED_FIELD]);

            if (array_diff(array_keys($plainFields), Protocol::PLAIN_MULTIPART_FIELDS) !== []) {
                return false;
            }
            if ($envelope === null) {
                return true;
            }

            $plaintext = is_string($envelope) ? Protocol::decrypt($key->encryptionKey, $envelope) : null;
            if ($plaintext === null) {
                return false;
            }

            parse_str($plaintext, $fields);
            $request->request->replace([...$fields, ...$plainFields]);

            return true;
        }

        $content = trim($request->getContent());
        $payload = $content === '' ? [] : json_decode($content, true);

        if ($payload === []) {
            return true;
        }
        if (! is_array($payload) || array_keys($payload) !== [Protocol::ENCRYPTED_FIELD] || ! is_string($payload[Protocol::ENCRYPTED_FIELD])) {
            return false;
        }

        $plaintext = Protocol::decrypt($key->encryptionKey, $payload[Protocol::ENCRYPTED_FIELD]);
        $fields = $plaintext === null ? null : json_decode($plaintext, true);

        if (! is_array($fields)) {
            return false;
        }

        $request->json()->replace($fields);
        $request->request->replace($fields);

        return true;
    }

    private function reject(Request $request, string $surface, int $status, string $error, string $reason): JsonResponse
    {
        Log::warning('request_signing.rejected', [
            'surface' => $surface,
            'reason' => $reason,
            'method' => $request->getRealMethod(),
            'path' => $request->path(),
            'subject' => $this->subjects->for($surface)->identify($request),
        ]);

        return response()->json(['error' => $error, 'reason' => $reason], $status);
    }
}
