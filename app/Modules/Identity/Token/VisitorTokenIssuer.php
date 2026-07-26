<?php

namespace App\Modules\Identity\Token;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;

/**
 * Cấp và kiểm token cho người dùng cuối — chuỗi có chữ ký, KHÔNG lưu DB.
 *
 * Mỗi khách vãng lai vào website là một token. Lưu DB là đẻ một hàng cho mỗi
 * người lạ lướt qua: bảng phình theo lưu lượng truy cập chứ không theo số khách
 * hàng. Chuỗi ký + hạn ngắn cho cùng tính chất mà không tốn hàng nào.
 *
 * Phạm vi nằm BÊN TRONG token, không nhận từ tham số của client — đó là thứ
 * ngăn một khách đọc hội thoại của khách khác bằng cách đổi một con số trên URL.
 */
class VisitorTokenIssuer
{
    /** Đủ cho một phiên trò chuyện, đủ ngắn để một token rò ra ngoài không thành cửa mở. */
    private const TTL_SECONDS = 3600;

    public function issue(string $workspaceId, string $channelAccountId, string $identityId, string $profileId): string
    {
        return Crypt::encryptString(json_encode([
            'w' => $workspaceId,
            'a' => $channelAccountId,
            'i' => $identityId,
            'p' => $profileId,
            'exp' => now()->addSeconds(self::TTL_SECONDS)->timestamp,
        ], JSON_THROW_ON_ERROR));
    }

    public function ttlSeconds(): int
    {
        return self::TTL_SECONDS;
    }

    /**
     * Trả `null` cho MỌI kiểu token hỏng — chữ ký sai, hết hạn, hay méo dạng.
     *
     * Phân biệt ba trường hợp đó trong phản hồi là nói cho người dò biết họ đang
     * sai ở đâu.
     */
    public function verify(string $token): ?VisitorToken
    {
        try {
            $payload = json_decode(Crypt::decryptString($token), true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return null;
        }

        if (! is_array($payload) || ($payload['exp'] ?? 0) < now()->timestamp) {
            return null;
        }

        foreach (['w', 'a', 'i', 'p'] as $key) {
            if (! isset($payload[$key]) || ! is_string($payload[$key])) {
                Log::warning('Token người dùng cuối thiếu trường bắt buộc', ['missing' => $key]);

                return null;
            }
        }

        return new VisitorToken(
            workspaceId: $payload['w'],
            channelAccountId: $payload['a'],
            identityId: $payload['i'],
            profileId: $payload['p'],
            expiresAt: (int) $payload['exp'],
        );
    }
}
