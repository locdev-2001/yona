<?php

use App\Support\PlainTextContent;

// Thay cho CommonMarker + String#truncate_words (spec/models/notification_spec.rb
// kiểm gián tiếp qua push_message_body).

it('turns markdown links into their label', function () {
    expect(PlainTextContent::fromMarkdown('Hey [@John](mention://user/1/john), can you check?'))
        ->toBe('Hey @John, can you check?');
});

it('drops emphasis markers', function () {
    expect(PlainTextContent::fromMarkdown('**bold** and _italic_ and `code`'))->toBe('bold and italic and code');
});

it('returns an empty string for missing content', function () {
    expect(PlainTextContent::fromMarkdown(null))->toBe('')
        ->and(PlainTextContent::truncateWords(null, 10))->toBe('');
});

it('cuts after the word limit and marks the cut', function () {
    expect(PlainTextContent::truncateWords('mot hai ba bon nam sau', 3))->toBe('mot hai ba...');
});

it('leaves a short text untouched', function () {
    expect(PlainTextContent::truncateWords('mot hai ba', 3))->toBe('mot hai ba');
});
