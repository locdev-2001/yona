<?php

namespace App\Services\Messaging;

use App\Messaging\Structured\StructuredTypeRegistry;
use App\Messaging\Structured\Types\CardsType;
use App\Models\Channel\WebWidget;
use App\Models\Message;
use App\Models\MessageAccessToken;
use App\Support\Base62;
use Illuminate\Support\Facades\URL;

/**
 * Trang công khai theo token (phase-05 §C) — link Yona duy nhất khách được mở
 * ngoài widget (Zalo/SMS), không đăng nhập, không dùng lại uuid hội thoại của
 * CSAT vì uuid đó không hết hạn và dùng chung cho mọi trang.
 */
final class PublicFlowService
{
    private const TOKEN_BYTES = 32;

    private const EXPIRES_AFTER_DAYS = 14;

    public function __construct(private readonly StructuredTypeRegistry $registry) {}

    public function issue(Message $message, string $purpose, ?string $itemId = null): string
    {
        $token = Base62::randomToken(self::TOKEN_BYTES);

        MessageAccessToken::query()->create([
            'message_id' => $message->id,
            'message_created_at' => MessageAccessToken::messageCreatedAtOf($message),
            'purpose' => $purpose,
            'item_id' => $itemId,
            'token_hash' => self::hash($token),
            'expires_at' => now()->addDays(self::EXPIRES_AFTER_DAYS),
        ]);

        return URL::to('/m/'.$token);
    }

    // Chống dò: token sai, hết hạn, đã dùng đều trả về null như nhau — nơi gọi
    // luôn quy ra 404 giống hệt, không lộ token nào tồn tại.
    public function resolve(string $token): ?MessageAccessToken
    {
        $record = MessageAccessToken::query()->where('token_hash', self::hash($token))->first();

        if ($record === null || $record->isConsumed() || $record->isExpired()) {
            return null;
        }

        return $record;
    }

    public function consume(MessageAccessToken $token): void
    {
        $token->update(['consumed_at' => now()]);
    }

    /**
     * Dữ liệu trang ứng với một cặp (tin, trang, mã thẻ) — dùng chung để (a) API
     * công khai dựng payload từ token đã phát, và (b) widget kiểm tin/hành động có
     * thật trang đó trước khi phát token mới. Trả null nếu không hợp lệ.
     *
     * @return array{message_id: int, title: string, subtitle: ?string, data: array<string, mixed>, source_message_id?: int}|null
     */
    public function describe(Message $message, string $purpose, ?string $itemId): ?array
    {
        $attributes = $this->registry->read($message);

        if ($attributes === null) {
            return null;
        }

        if ($itemId !== null) {
            return $this->describeCardItem($message, $attributes, $itemId);
        }

        // Form dài (FormType::needsPublicPage) mở trang "form" với chính danh sách ô của tin.
        if ($message->contentTypeName() === 'form' && $purpose === 'form') {
            return [
                'message_id' => $message->id,
                'title' => trim((string) $message->content),
                'subtitle' => null,
                'data' => $attributes,
            ];
        }

        if ($message->contentTypeName() !== 'webview' || ($attributes['page'] ?? null) !== $purpose) {
            return null;
        }

        return [
            'message_id' => $message->id,
            'title' => $attributes['title'],
            'subtitle' => $attributes['subtitle'] ?? null,
            'data' => $attributes['data'] ?? [],
        ];
    }

    /** @param array<string, mixed> $attributes */
    private function describeCardItem(Message $message, array $attributes, string $itemId): ?array
    {
        if ($message->contentTypeName() !== 'cards') {
            return null;
        }

        $item = CardsType::findItem($attributes, $itemId);

        if ($item === null) {
            return null;
        }

        return [
            'message_id' => $message->id,
            'title' => $item['title'],
            'subtitle' => null,
            'data' => $item,
            'source_message_id' => $message->id,
        ];
    }

    /**
     * Header CSP của trang `/m/{token}`. `frame-ancestors` xét MỌI khung cha, kể cả trang
     * của shop ở ngoài cùng, nên trang phải cho nhúng đúng như chính widget: kênh website
     * chưa khai domain thì không gửi header (widget nhúng được ở mọi nơi, sheet cũng vậy);
     * đã khai thì self + các domain đó. Kênh khác chỉ mở trực tiếp từ link nên chỉ 'self'.
     */
    public function frameAncestorsHeader(Message $message, ?string $origin): ?string
    {
        $channel = $message->inbox->channel;

        return $channel instanceof WebWidget
            ? $channel->frameAncestorsPolicy($origin)
            : "frame-ancestors 'self'";
    }

    private static function hash(string $token): string
    {
        return hash('sha256', $token);
    }
}
