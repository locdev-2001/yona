<?php

namespace App\Services\Integrations\Slack;

// Port từ `Slack::Messages::Formatting.unescape` (gem slack-ruby-client) — chuyển
// cú pháp mrkdwn của Slack (<url>, <@U123|name>, <#C123|general>, HTML entity)
// về văn bản thường trước khi lưu làm nội dung tin nhắn Chatwoot.
class SlackFormatting
{
    public static function unescape(string $message): string
    {
        $message = str_replace(['“', '”'], '"', $message);
        $message = str_replace(['‘', '’'], "'", $message);

        $message = preg_replace_callback('/<([?@#!]?)(.*?)>/', function (array $matches) {
            $sign = $matches[1];
            $dt = $matches[2];
            $parts = explode('|', $dt, 2);
            $rhs = end($parts);

            return match ($sign) {
                '@', '!' => "@{$rhs}",
                '#' => "#{$rhs}",
                default => $rhs,
            };
        }, $message);

        return html_entity_decode($message, ENT_QUOTES | ENT_HTML5);
    }

    // RegexHelper::MENTION_REGEX — link markdown mention của Chatwoot
    // `[@Tên](mention://user|team/id/tên)`, vẫn dùng trong nội dung gửi ra Slack.
    public static function stripMentionLinks(?string $text): ?string
    {
        if ($text === null) {
            return null;
        }

        return preg_replace('/\[(@[^\]]+)\]\(mention:\/\/(?:user|team)\/\d+\/([^)]+)\)/', '$1', $text);
    }
}
