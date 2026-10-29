<?php

namespace App\Services\MessengerPersonal;

use Illuminate\Http\Client\Response;

/**
 * Đọc kết quả của sidecar (`{ok: true, …}` hoặc `{ok: false, code, message}`) thành một
 * hình dạng chung kèm câu đã dịch. Một chỗ phân loại mã lỗi: thêm mã mới của hợp đồng
 * chỉ sửa ở đây và ở `lang/{locale}/errors.php` khối `messenger_personal.action`.
 */
final class BridgeOutcome
{
    public const BRIDGE_UNREACHABLE = 'bridge_unreachable';

    public const SECRET_MISMATCH = 'secret_mismatch';

    public const SESSION_LOST = 'session_lost';

    public const REJECTED = 'rejected';

    public const MEDIA_FETCH_FAILED = 'media_fetch_failed';

    public const UNKNOWN = 'unknown';

    /** Mã hợp đồng giữ nguyên; mã lạ quy về `unknown`. `unauthorized` là lỗi cấu hình secret phía mình. */
    private const CONTRACT_CODES = [
        self::SESSION_LOST,
        self::REJECTED,
        self::MEDIA_FETCH_FAILED,
        'bad_request',
        'not_found',
        'session_cap_reached',
        self::UNKNOWN,
    ];

    /**
     * @return array{ok: true, body: array<string, mixed>}|array{ok: false, code: string, message: string, detail: string}
     */
    public static function fromResponse(?Response $response, ?string $locale): array
    {
        if ($response === null) {
            return self::failure(self::BRIDGE_UNREACHABLE, $locale);
        }

        $body = is_array($response->json()) ? $response->json() : [];

        if ($response->successful() && ($body['ok'] ?? false) === true) {
            return ['ok' => true, 'body' => $body];
        }

        $detail = (string) ($body['message'] ?? 'HTTP '.$response->status());

        return self::failure(self::classify($response->status(), $body), $locale, $detail);
    }

    /** @return array{ok: false, code: string, message: string, detail: string} */
    public static function failure(string $code, ?string $locale, ?string $detail = null): array
    {
        return [
            'ok' => false,
            'code' => $code,
            'message' => __("errors.messenger_personal.action.{$code}", ['detail' => (string) $detail], $locale),
            'detail' => (string) $detail,
        ];
    }

    /** @param array<string, mixed> $body */
    private static function classify(int $status, array $body): string
    {
        $code = (string) ($body['code'] ?? '');

        if (in_array($code, self::CONTRACT_CODES, true)) {
            return $code;
        }

        if ($code === 'unauthorized' || $status === 401 || $status === 403) {
            return self::SECRET_MISMATCH;
        }

        return self::UNKNOWN;
    }
}
