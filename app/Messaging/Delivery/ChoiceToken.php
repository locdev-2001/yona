<?php

namespace App\Messaging\Delivery;

/**
 * Mã hoá/giải mã lựa chọn trong payload trả lời gốc của kênh, để map ngược về
 * tin gốc + giá trị đã chọn mà không cần khách gõ lại (docs §3 "Map câu trả
 * lời về lựa chọn").
 */
final class ChoiceToken
{
    // Giới hạn của Telegram Bot API cho callback_data.
    private const TELEGRAM_CALLBACK_DATA_MAX_BYTES = 64;

    public static function facebook(int $messageId, string $value): string
    {
        return "yona:{$messageId}:{$value}";
    }

    /** @return array{message_id: int, value: string}|null */
    public static function parseFacebook(string $payload): ?array
    {
        if (! preg_match('/^yona:(\d+):(.*)$/s', $payload, $matches)) {
            return null;
        }

        return ['message_id' => (int) $matches[1], 'value' => $matches[2]];
    }

    /**
     * `{message_id}:{value}`; khi vượt 64 byte thì thay bằng chỉ số trong danh
     * sách lựa chọn (`{message_id}:i{index}`) để luôn hợp lệ.
     */
    public static function telegram(int $messageId, string $value, int $index): string
    {
        $direct = "{$messageId}:{$value}";

        return strlen($direct) <= self::TELEGRAM_CALLBACK_DATA_MAX_BYTES ? $direct : "{$messageId}:i{$index}";
    }

    /** @return array{message_id: int, value?: string, index?: int}|null */
    public static function parseTelegram(string $data): ?array
    {
        if (! preg_match('/^(\d+):(.*)$/s', $data, $matches)) {
            return null;
        }

        if (preg_match('/^i(\d+)$/', $matches[2], $indexMatch)) {
            return ['message_id' => (int) $matches[1], 'index' => (int) $indexMatch[1]];
        }

        return ['message_id' => (int) $matches[1], 'value' => $matches[2]];
    }
}
