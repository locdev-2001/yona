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
}
