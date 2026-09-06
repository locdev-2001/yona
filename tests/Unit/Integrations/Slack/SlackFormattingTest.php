<?php

use App\Services\Integrations\Slack\SlackFormatting;

// Port từ Slack::Messages::Formatting.unescape (dùng trong incoming_message_builder_spec.rb).

it('bỏ dấu <> quanh link và giữ nhãn cho mention', function () {
    $text = 'this is test <https://chatwoot.com> Hey <@U019KT237LP|Sojan> Test again';

    expect(SlackFormatting::unescape($text))
        ->toBe('this is test https://chatwoot.com Hey @Sojan Test again');
});

it('gỡ được link markdown mention của Chatwoot khi gửi ra Slack', function () {
    $text = 'Hi [@Nguyễn Văn A](mention://user/12/Nguy%E1%BB%85n%20V%C4%83n%20A), welcome to Chatwoot!';

    expect(SlackFormatting::stripMentionLinks($text))
        ->toBe('Hi @Nguyễn Văn A, welcome to Chatwoot!');
});

it('giữ nguyên null', function () {
    expect(SlackFormatting::stripMentionLinks(null))->toBeNull();
});
