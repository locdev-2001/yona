<?php

use App\Services\Integrations\Slack\EmojiFormatter;

// Port từ spec/lib/integrations/slack/emoji_formatter_spec.rb.

it('thay shortcode bằng ký tự unicode', function () {
    expect(EmojiFormatter::format('Hello :smile:'))->toBe('Hello 😄')
        ->and(EmojiFormatter::format('Good job :+1:'))->toBe('Good job 👍')
        ->and(EmojiFormatter::format('Unknown :unknown_emoji:'))->toBe('Unknown :unknown_emoji:');
});

it('giữ nguyên chuỗi rỗng hoặc null', function () {
    expect(EmojiFormatter::format(null))->toBeNull()
        ->and(EmojiFormatter::format(''))->toBe('');
});

it('thay được nhiều emoji trong cùng một chuỗi', function () {
    expect(EmojiFormatter::format(':smile: :+1:'))->toBe('😄 👍');
});
