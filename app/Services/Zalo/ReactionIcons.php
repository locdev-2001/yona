<?php

namespace App\Services\Zalo;

/**
 * Mã cảm xúc của Zalo (`Reactions` trong zca-js — services/zalo-bridge/
 * node_modules/zca-js/dist/models/Reaction.d.ts) → emoji để hiển thị.
 * Bảng nằm ở driver: lõi chỉ thấy emoji, không biết mã nào của kênh nào.
 */
class ReactionIcons
{
    /** @var array<string, string> */
    private const EMOJI = [
        '/-heart' => '❤️',
        '/-strong' => '👍',
        ':>' => '😆',
        ':o' => '😮',
        ':-((' => '😢',
        ':-h' => '😡',
        ':-*' => '😘',
        ":')" => '😂',
        '/-shit' => '💩',
        '/-rose' => '🌹',
        '/-break' => '💔',
        '/-weak' => '👎',
        ';xx' => '😍',
        ';-/' => '😕',
        ';-)' => '😉',
        '/-fade' => '🥀',
        '/-li' => '☀️',
        '/-bd' => '🎂',
        '/-bome' => '💣',
        '/-ok' => '👌',
        '/-v' => '✌️',
        '/-thanks' => '🙏',
        '/-punch' => '👊',
        '/-share' => '🤝',
        '_()_' => '🙏',
        '/-no' => '🚫',
        '/-bad' => '👎',
        '/-loveu' => '🥰',
        '--b' => '😔',
        ':((' => '😭',
        'x-)' => '😎',
        '8-)' => '🤓',
        ';-d' => '😃',
        'b-)' => '😎',
        ':--|' => '😐',
        'p-(' => '😞',
        ':-bye' => '👋',
        '|-)' => '😴',
        ':wipe' => '😅',
        ':-dig' => '⛏️',
        '&-(' => '😩',
        ':handclap' => '👏',
        '>-|' => '😠',
        ':-f' => '🪑',
        ':-l' => '🪑',
        ':-r' => '🪑',
        ';-x' => '🤐',
        ':-o' => '😲',
        ';-s' => '😳',
        ';-a' => '😨',
        ':-<' => '☹️',
        ':))' => '😂',
        '$-)' => '🤑',
        '/-beer' => '🍺',
    ];

    /** Mã lạ (zca thêm cảm xúc mới) → giữ nguyên mã, thà hiện thô còn hơn mất. */
    public static function emoji(string $code): string
    {
        return self::EMOJI[$code] ?? $code;
    }

    /**
     * Chiều ngược lại cho tin đi: agent chọn emoji, Zalo chỉ hiểu mã của nó.
     * Nhiều mã cùng trỏ một emoji (🙏 có `/-thanks` và `_()_`, 👎 có `/-weak` và
     * `/-bad`) — lấy mã ĐẦU TIÊN trong bảng để một emoji luôn ra một mã.
     * Emoji Zalo không có → null, tầng gọi trả `capability_not_supported`-style lỗi.
     */
    public static function code(string $emoji): ?string
    {
        foreach (self::EMOJI as $code => $known) {
            if ($known === $emoji) {
                return $code;
            }
        }

        return null;
    }
}
