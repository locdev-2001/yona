<?php

use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use Illuminate\Support\Facades\Queue;

// Tin agent gửi đi mang `content_attributes.mentions`: lõi neo lại offset/length
// (đơn vị UTF-16) theo nội dung CUỐI, sau khi đã render biến Liquid.

beforeEach(function () {
    Queue::fake();

    $this->inbox = Inbox::factory()->zalo()->create();
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->inbox->account_id,
        'inbox_id' => $this->inbox->id,
        'additional_attributes' => ['thread_id' => 'g1', 'thread_type' => 1],
    ]);
});

/**
 * @param  list<array<string, mixed>>|mixed  $mentions
 * @param  array<string, mixed>  $overrides
 */
function mentionedMessage(Conversation $conversation, string $content, mixed $mentions, array $overrides = []): Message
{
    return $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => $content,
        'content_attributes' => ['mentions' => $mentions],
        ...$overrides,
    ])->refresh();
}

it('neo vị trí khi client không gửi offset', function () {
    $message = mentionedMessage($this->conversation, '@An ơi', [['external_id' => '555', 'name' => 'An']]);

    expect($message->content_attributes['mentions'])->toBe([
        ['external_id' => '555', 'name' => 'An', 'offset' => 0, 'length' => 3],
    ]);
});

it('đếm vị trí theo đơn vị UTF-16 như chỉ số chuỗi JavaScript', function () {
    $message = mentionedMessage($this->conversation, '😀 @Bình xem', [['external_id' => '1', 'name' => 'Bình']]);

    expect($message->content_attributes['mentions'][0])->toMatchArray(['offset' => 3, 'length' => 5]);
});

it('neo lại theo nội dung sau khi render biến Liquid', function () {
    $this->conversation->contact->update(['name' => 'Nguyễn Văn Bình']);

    $message = mentionedMessage($this->conversation, 'Chào {{contact.name}} @An', [
        ['external_id' => '555', 'name' => 'An', 'offset' => 21],
    ]);

    expect($message->content)->toBe('Chào Nguyễn Văn Bình @An')
        ->and($message->content_attributes['mentions'][0])->toMatchArray(['offset' => 21, 'length' => 3]);

    $shifted = mentionedMessage($this->conversation, '{{contact.name}} ơi @An', [
        ['external_id' => '555', 'name' => 'An', 'offset' => 20],
    ]);

    expect($shifted->content_attributes['mentions'][0]['offset'])->toBe(19);
});

it('hai người trùng tên được neo đúng chỗ và đúng thứ tự', function () {
    $message = mentionedMessage($this->conversation, '@An và @An', [
        ['external_id' => 'b', 'name' => 'An', 'offset' => 7],
        ['external_id' => 'a', 'name' => 'An', 'offset' => 0],
    ]);

    expect($message->content_attributes['mentions'])->toBe([
        ['external_id' => 'a', 'name' => 'An', 'offset' => 0, 'length' => 3],
        ['external_id' => 'b', 'name' => 'An', 'offset' => 7, 'length' => 3],
    ]);
});

it('mục không có gợi ý vẫn tìm được chỗ trước mục đã có gợi ý', function () {
    $message = mentionedMessage($this->conversation, '@An và @Bình', [
        ['external_id' => '2', 'name' => 'Bình', 'offset' => 7],
        ['external_id' => '1', 'name' => 'An'],
    ]);

    expect(array_column($message->content_attributes['mentions'], 'offset', 'external_id'))->toBe(['1' => 0, '2' => 7]);
});

it('không khớp @An vào @Anh hay vào giữa địa chỉ email', function () {
    $message = mentionedMessage($this->conversation, '@Anh ơi, mail an@An.vn', [['external_id' => '1', 'name' => 'An']]);

    expect($message->content_attributes)->not->toHaveKey('mentions');
});

it('bỏ mục không có trong nội dung, bỏ hết thì mất khoá mentions', function () {
    $message = mentionedMessage($this->conversation, '@An xem giúp', [
        ['external_id' => '1', 'name' => 'An'],
        ['external_id' => '2', 'name' => 'Bình'],
    ]);

    expect($message->content_attributes['mentions'])->toHaveCount(1);

    $none = mentionedMessage($this->conversation, 'không nhắc ai', [['external_id' => '2', 'name' => 'Bình']]);

    expect($none->content_attributes)->not->toHaveKey('mentions');
});

it('chuẩn hoá mục: bỏ khoá lạ, external_id số thành chuỗi, cắt khoảng trắng, tối đa 50 mục', function () {
    $message = mentionedMessage($this->conversation, '@Bình xem', [
        ['external_id' => 555, 'name' => '  Bình ', 'offset' => 'x', 'uid' => '999', 'avatar' => '/a.png'],
        ['external_id' => '', 'name' => 'Bình'],
        'không phải mục',
    ]);

    expect($message->content_attributes['mentions'])->toBe([
        ['external_id' => '555', 'name' => 'Bình', 'offset' => 0, 'length' => 5],
    ]);

    $many = array_map(fn (int $i) => ['external_id' => (string) $i, 'name' => "N{$i}"], range(1, 60));
    $content = implode(' ', array_map(fn (int $i) => "@N{$i}", range(1, 60)));

    expect(mentionedMessage($this->conversation, $content, $many)->content_attributes['mentions'])->toHaveCount(50);
});

it('ghi chú riêng không mang nhắc tên của kênh', function () {
    $message = mentionedMessage($this->conversation, '@An xem', [['external_id' => '1', 'name' => 'An']], ['private' => true]);

    expect($message->content_attributes)->not->toHaveKey('mentions');
});

it('kênh không khai outbound_mention thì bỏ nhắc tên', function () {
    $inbox = Inbox::factory()->telegram()->create(['account_id' => $this->inbox->account_id]);
    $conversation = Conversation::factory()->create(['account_id' => $inbox->account_id, 'inbox_id' => $inbox->id]);

    $message = mentionedMessage($conversation, '@An xem', [['external_id' => '1', 'name' => 'An']]);

    expect($message->content_attributes)->not->toHaveKey('mentions');
});

it('giữ nguyên vị trí nền tảng cấp cho tin đến và tin kênh dội lại', function () {
    $platformMentions = [['external_id' => '1', 'name' => 'An', 'offset' => 4, 'length' => 3]];

    $incoming = mentionedMessage($this->conversation, 'nhờ @An', $platformMentions, ['message_type' => Message::TYPE_INCOMING]);
    $echo = $this->conversation->messages()->create([
        'account_id' => $this->conversation->account_id,
        'inbox_id' => $this->conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content' => 'không khớp gì cả',
        'content_attributes' => ['mentions' => $platformMentions, 'external_echo' => true],
    ])->refresh();

    expect($incoming->content_attributes['mentions'])->toBe($platformMentions)
        ->and($echo->content_attributes['mentions'])->toBe($platformMentions);
});
