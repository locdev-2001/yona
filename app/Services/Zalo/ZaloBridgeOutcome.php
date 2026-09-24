<?php

namespace App\Services\Zalo;

use Illuminate\Http\Client\Response;

/**
 * Đọc kết quả các cửa ra của bridge (`{ok, …}` hoặc `{ok:false, code, message}`)
 * thành một hình dạng chung cho mọi driver Zalo, kèm câu lỗi đã dịch. Một chỗ
 * phân loại lỗi: thêm mã mới của bridge chỉ sửa ở đây.
 */
final class ZaloBridgeOutcome
{
    public const BRIDGE_UNREACHABLE = 'bridge_unreachable';

    public const SECRET_MISMATCH = 'secret_mismatch';

    public const SESSION_LOST = 'session_lost';

    public const UNKNOWN = 'unknown';

    /** Mã bridge trả về nguyên văn được giữ nguyên; chỉ mã lạ mới quy về `unknown`. */
    private const BRIDGE_CODES = [self::SESSION_LOST, 'zalo_rejected', 'bad_request', self::UNKNOWN];

    /**
     * @return array{ok: true, body: array<string, mixed>}|array{ok: false, code: string, message: string}
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

        $detail = (string) ($body['message'] ?? $body['error'] ?? 'HTTP '.$response->status());

        return self::failure(self::classify($response->status(), $body), $locale, $detail);
    }

    /** @return array{ok: false, code: string, message: string} */
    public static function failure(string $code, ?string $locale, ?string $detail = null): array
    {
        return [
            'ok' => false,
            'code' => $code,
            'message' => __("errors.zalo.action.{$code}", ['detail' => (string) $detail], $locale),
        ];
    }

    /**
     * 503/403 của bridge là kiểm tra send secret (cùng cửa với /personal-messages/send),
     * lỗi cấu hình phía mình — tuyệt đối không hiểu thành mất phiên Zalo.
     *
     * @param  array<string, mixed>  $body
     */
    private static function classify(int $status, array $body): string
    {
        $code = (string) ($body['code'] ?? '');

        if (in_array($code, self::BRIDGE_CODES, true)) {
            return $code;
        }

        if ($status === 503 || $status === 403) {
            return self::SECRET_MISMATCH;
        }

        return self::UNKNOWN;
    }
}
