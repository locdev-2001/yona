<?php

use App\Models\Account;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Services\Messages\Forwarding\ForwardBlock;
use App\Services\Messages\Forwarding\ForwardRequirements;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

// Luật chuyển tiếp: tin nguồn nào chuyển tiếp được và hộp thư đích cần năng lực gì.

beforeEach(function () {
    Queue::fake();
    Storage::fake('public');

    $this->account = Account::factory()->create(['locale' => 'vi']);
    $this->source = forwardReqConversation($this->account, Inbox::factory()->zalo()->create(['account_id' => $this->account->id]));
});

function forwardReqConversation(Account $account, Inbox $inbox): Conversation
{
    return Conversation::factory()->create(['account_id' => $account->id, 'inbox_id' => $inbox->id]);
}

/** @param array<string, mixed> $attributes */
function forwardReqMessage(Conversation $conversation, array $attributes = []): Message
{
    return $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_INCOMING,
        'content' => 'Còn hàng không shop?',
        ...$attributes,
    ]);
}

/** @param array<string, mixed> $overrides */
function forwardReqAttach(Message $message, UploadedFile $file, array $overrides = []): Attachment
{
    $attachment = $message->attachments()->create([...Attachment::storeUpload($file, $message->account_id), ...$overrides]);
    $message->unsetRelation('attachments');

    return $attachment;
}

/** @return list<string> */
function forwardReqCapabilities(Message $message): array
{
    return array_map(fn ($capability) => $capability->value, ForwardRequirements::capabilitiesFor($message));
}

it('tin chữ cần outbound_text; ảnh kèm chú thích cần chữ và ảnh', function () {
    $text = forwardReqMessage($this->source);
    $image = forwardReqMessage($this->source, ['content' => 'Mẫu này nè']);
    forwardReqAttach($image, UploadedFile::fake()->image('mau.png'));

    expect(ForwardRequirements::check($text, null, 'vi'))->toBeNull()
        ->and(forwardReqCapabilities($text))->toBe(['outbound_text'])
        ->and(forwardReqCapabilities($image))->toBe(['outbound_text', 'outbound_image']);
});

it('video, âm thanh (kể cả tin thoại) và tệp cần đúng năng lực, theo thứ tự enum', function () {
    $message = forwardReqMessage($this->source, ['content' => null]);
    forwardReqAttach($message, UploadedFile::fake()->create('bao-gia.pdf', 5, 'application/pdf'));
    forwardReqAttach($message, UploadedFile::fake()->create('ghi-am.ogg', 5, 'audio/ogg'), ['meta' => ['is_voice_message' => true]]);
    forwardReqAttach($message, UploadedFile::fake()->create('clip.mp4', 5, 'video/mp4'), ['file_type' => Attachment::FILE_TYPE_VIDEO, 'content_type' => 'video/mp4']);

    expect(ForwardRequirements::check($message, null, 'vi'))->toBeNull()
        ->and(forwardReqCapabilities($message))->toBe(['outbound_video', 'outbound_audio', 'outbound_file']);
});

it('sticker chỉ cần outbound_sticker, không tính ảnh đính kèm của sticker', function () {
    $sticker = forwardReqMessage($this->source, [
        'content' => null,
        'content_type' => Message::CONTENT_TYPES['sticker'],
        'content_attributes' => ['sticker' => ['id' => 98930, 'catId' => 61900, 'type' => 7, 'url' => 'https://zalo-api.zadn.vn/sticker/98930.webp']],
    ]);
    $sticker->attachments()->create(['account_id' => $sticker->account_id, 'file_type' => Attachment::FILE_TYPE_IMAGE, 'external_url' => 'https://zalo-api.zadn.vn/sticker/98930.webp']);
    $sticker->unsetRelation('attachments');

    expect(ForwardRequirements::check($sticker, null, 'vi'))->toBeNull()
        ->and(forwardReqCapabilities($sticker))->toBe(['outbound_sticker'])
        ->and(ForwardRequirements::forwardableAttachments($sticker))->toBe([]);
});

it('chặn loại tin không chuyển tiếp được bằng not_forwardable', function (Closure $makeMessage) {
    $block = ForwardRequirements::check($makeMessage($this->source), null, 'vi');

    expect($block?->code)->toBe(ForwardBlock::NOT_FORWARDABLE)
        ->and($block?->message)->toBe('Loại tin này chưa chuyển tiếp được.');
})->with([
    'ghi chú riêng' => [fn (Conversation $c) => forwardReqMessage($c, ['message_type' => Message::TYPE_OUTGOING, 'private' => true])],
    'tin đã thu hồi' => [fn (Conversation $c) => tap(forwardReqMessage($c), fn (Message $m) => $m->markDeleted('vi'))],
    'tin hoạt động' => [fn (Conversation $c) => forwardReqMessage($c, ['message_type' => Message::TYPE_ACTIVITY])],
    'tin chọn đáp án' => [fn (Conversation $c) => forwardReqMessage($c, ['content_type' => Message::CONTENT_TYPES['input_select']])],
    'thẻ ngân hàng' => [fn (Conversation $c) => forwardReqMessage($c, ['content_attributes' => ['bank_card' => ['bank' => 'VCB']]])],
    'danh thiếp' => [fn (Conversation $c) => forwardReqMessage($c, ['content_attributes' => ['business_card' => ['name' => 'A']]])],
    'nhắc hẹn' => [fn (Conversation $c) => forwardReqMessage($c, ['content_attributes' => ['reminder' => ['title' => 'Hẹn']]])],
    'cuộc gọi' => [fn (Conversation $c) => forwardReqMessage($c, ['content_attributes' => ['call' => ['duration' => 5]]])],
    'lời mời kết bạn' => [fn (Conversation $c) => forwardReqMessage($c, ['content_attributes' => ['friend_request' => ['message' => 'Hi']]])],
    'vị trí' => [fn (Conversation $c) => tap(forwardReqMessage($c, ['content' => null]), function (Message $m) {
        $m->attachments()->create([
            'account_id' => $m->account_id,
            'file_type' => Attachment::FILE_TYPE_LOCATION,
            'coordinates_lat' => 10.7,
            'coordinates_long' => 106.6,
        ]);
        $m->unsetRelation('attachments');
    })],
    'vị trí kèm chữ' => [fn (Conversation $c) => tap(forwardReqMessage($c), function (Message $m) {
        $m->attachments()->create(['account_id' => $m->account_id, 'file_type' => Attachment::FILE_TYPE_LOCATION, 'coordinates_lat' => 1, 'coordinates_long' => 2]);
        $m->unsetRelation('attachments');
    })],
    'tin rỗng' => [fn (Conversation $c) => forwardReqMessage($c, ['content' => null])],
    'sticker thiếu dữ liệu sticker' => [fn (Conversation $c) => forwardReqMessage($c, ['content' => null, 'content_type' => Message::CONTENT_TYPES['sticker']])],
]);

it('đính kèm không còn tệp hoặc là liên kết hết hạn → attachment_unavailable, câu có tên tệp', function () {
    $noFile = forwardReqMessage($this->source, ['content' => null]);
    $noFile->attachments()->create(['account_id' => $noFile->account_id, 'file_type' => Attachment::FILE_TYPE_IMAGE, 'external_url' => 'https://cdn.zalo.test/het-han.jpg', 'fallback_title' => 'anh-cu.jpg']);
    $fallback = forwardReqMessage($this->source);
    $fallback->attachments()->create(['account_id' => $fallback->account_id, 'file_type' => Attachment::FILE_TYPE_FALLBACK, 'fallback_title' => 'bao-gia.xlsx']);
    $noFile->unsetRelation('attachments');
    $fallback->unsetRelation('attachments');

    $noFileBlock = ForwardRequirements::check($noFile, null, 'vi');
    $fallbackBlock = ForwardRequirements::check($fallback, null, 'vi');

    expect($noFileBlock?->code)->toBe(ForwardBlock::ATTACHMENT_UNAVAILABLE)
        ->and($noFileBlock?->message)->toBe('Tệp anh-cu.jpg không còn trên máy chủ nên không chuyển tiếp được.')
        ->and($fallbackBlock?->code)->toBe(ForwardBlock::ATTACHMENT_UNAVAILABLE)
        ->and($fallbackBlock?->message)->toContain('bao-gia.xlsx');
});

it('đích SMS nhận chữ nhưng không nhận ảnh → capability_not_supported kèm tên hộp thư', function () {
    $image = forwardReqMessage($this->source, ['content' => 'Mẫu này nè']);
    forwardReqAttach($image, UploadedFile::fake()->image('mau.png'));
    $smsInbox = Inbox::factory()->sms()->create(['account_id' => $this->account->id, 'name' => 'SMS Shop']);
    $sms = forwardReqConversation($this->account, $smsInbox);

    $block = ForwardRequirements::check($image, $sms, 'vi');

    expect($block?->code)->toBe(ForwardBlock::CAPABILITY_NOT_SUPPORTED)
        ->and($block?->missingCapabilities)->toBe(['outbound_image'])
        ->and($block?->message)->toBe('Hộp thư SMS Shop không gửi được ảnh.')
        ->and(ForwardRequirements::check(forwardReqMessage($this->source), $sms, 'vi'))->toBeNull();
});

it('câu lỗi theo locale được truyền vào', function () {
    $image = forwardReqMessage($this->source, ['content' => null]);
    forwardReqAttach($image, UploadedFile::fake()->image('mau.png'));
    $sms = forwardReqConversation($this->account, Inbox::factory()->sms()->create(['account_id' => $this->account->id, 'name' => 'SMS']));

    expect(ForwardRequirements::check($image, $sms, 'en')?->message)->toBe('The SMS inbox cannot send images.');
});

it('đích Api có cửa sổ trả lời đã hết → reply_window_closed', function () {
    $apiInbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $apiInbox->channel->update(['additional_attributes' => ['agent_reply_time_window' => 1]]);
    $target = forwardReqConversation($this->account, $apiInbox);
    forwardReqMessage($target)->forceFill(['created_at' => now()->subHours(3)])->save();

    expect(ForwardRequirements::check(forwardReqMessage($this->source), $target->fresh(), 'vi')?->code)
        ->toBe(ForwardBlock::REPLY_WINDOW_CLOSED);
});

it('sticker Zalo sang Telegram thiếu năng lực; sang Zalo mà danh mục không đọc được → sticker_unavailable', function () {
    $sticker = forwardReqMessage($this->source, [
        'content' => null,
        'content_type' => Message::CONTENT_TYPES['sticker'],
        'content_attributes' => ['sticker' => ['id' => 98930, 'catId' => 61900, 'type' => 7, 'url' => 'https://zalo-api.zadn.vn/sticker/98930.webp']],
    ]);
    $broken = forwardReqMessage($this->source, [
        'content' => null,
        'content_type' => Message::CONTENT_TYPES['sticker'],
        'content_attributes' => ['sticker' => ['id' => 'khong-phai-ma']],
    ]);
    $telegram = forwardReqConversation($this->account, Inbox::factory()->telegram()->create(['account_id' => $this->account->id]));
    $otherZalo = forwardReqConversation($this->account, Inbox::factory()->zalo()->create(['account_id' => $this->account->id]));

    expect(ForwardRequirements::check($sticker, $telegram, 'vi')?->code)->toBe(ForwardBlock::CAPABILITY_NOT_SUPPORTED)
        ->and(ForwardRequirements::check($sticker, $telegram, 'vi')?->missingCapabilities)->toBe(['outbound_sticker'])
        ->and(ForwardRequirements::check($sticker, $otherZalo, 'vi'))->toBeNull()
        ->and(ForwardRequirements::check($broken, $otherZalo, 'vi')?->code)->toBe(ForwardBlock::STICKER_UNAVAILABLE);
});
