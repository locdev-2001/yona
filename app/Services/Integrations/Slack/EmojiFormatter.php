<?php

namespace App\Services\Integrations\Slack;

// Port từ refs/chatwoot/lib/integrations/slack/emoji_formatter.rb. Bản gốc tra
// alias qua gem `gemoji` (toàn bộ danh mục emoji Unicode); ở đây dùng bảng con
// các alias Slack hay dùng nhất — alias không có trong bảng giữ nguyên văn bản
// gốc (Emoji.find_by_alias trả nil), đúng hành vi khi gặp shortcode lạ.
class EmojiFormatter
{
    // Bảng alias → ký tự Unicode thật (không phải dữ liệu giả), rút gọn từ
    // danh mục gemoji cho các shortcode phổ biến nhất trên Slack.
    private const ALIASES = [
        '+1' => '👍',
        'thumbsup' => '👍',
        '-1' => '👎',
        'thumbsdown' => '👎',
        'smile' => '😄',
        'smiley' => '😃',
        'grinning' => '😀',
        'laughing' => '😆',
        'satisfied' => '😆',
        'joy' => '😂',
        'rofl' => '🤣',
        'wink' => '😉',
        'blush' => '😊',
        'heart_eyes' => '😍',
        'kissing_heart' => '😘',
        'thinking' => '🤔',
        'thinking_face' => '🤔',
        'neutral_face' => '😐',
        'expressionless' => '😑',
        'disappointed' => '😞',
        'worried' => '😟',
        'cry' => '😢',
        'sob' => '😭',
        'angry' => '😠',
        'rage' => '😡',
        'scream' => '😱',
        'sweat_smile' => '😅',
        'sunglasses' => '😎',
        'confused' => '😕',
        'flushed' => '😳',
        'tired_face' => '😫',
        'sleeping' => '😴',
        'zzz' => '💤',
        'heart' => '❤️',
        'broken_heart' => '💔',
        'tada' => '🎉',
        'party' => '🎉',
        'fire' => '🔥',
        'star' => '⭐',
        'sparkles' => '✨',
        '100' => '💯',
        'clap' => '👏',
        'pray' => '🙏',
        'raised_hands' => '🙌',
        'wave' => '👋',
        'ok_hand' => '👌',
        'muscle' => '💪',
        'point_up' => '☝️',
        'point_down' => '👇',
        'point_left' => '👈',
        'point_right' => '👉',
        'eyes' => '👀',
        'white_check_mark' => '✅',
        'heavy_check_mark' => '✔️',
        'x' => '❌',
        'warning' => '⚠️',
        'question' => '❓',
        'exclamation' => '❗',
        'bulb' => '💡',
        'rocket' => '🚀',
        'tada2' => '🎊',
        'coffee' => '☕',
        'beers' => '🍻',
        'pizza' => '🍕',
        'bug' => '🐛',
        'construction' => '🚧',
        'gear' => '⚙️',
        'lock' => '🔒',
        'unlock' => '🔓',
        'email' => '📧',
        'phone' => '📞',
        'calendar' => '📅',
        'moneybag' => '💰',
        'chart_with_upwards_trend' => '📈',
        'chart_with_downwards_trend' => '📉',
        'raised_hand' => '✋',
        'v' => '✌️',
        'thumbsup_all' => '👍',
        'shrug' => '🤷',
        'facepalm' => '🤦',
    ];

    public static function format(?string $text): ?string
    {
        if (blank($text)) {
            return $text;
        }

        return preg_replace_callback('/:([a-zA-Z0-9_+-]+):/', function (array $matches) {
            return self::ALIASES[$matches[1]] ?? $matches[0];
        }, $text);
    }
}
