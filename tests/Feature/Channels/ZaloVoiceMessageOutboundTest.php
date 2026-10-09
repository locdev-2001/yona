<?php

use App\Channels\Capability;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

// Bản ghi âm thu ở ô soạn đi ra Zalo thành tin thoại (media_kind voice → bridge
// sendVoice); tệp âm thanh tải lên thường vẫn là tệp. Kênh không khai
// outbound_voice thì bản ghi âm chỉ là một tệp âm thanh như mọi tệp khác.

function voiceOutboundAgent(Inbox $inbox): User
{
    $agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $inbox->account_id, 'user_id' => $agent->id, 'role' => AccountUser::ROLE_AGENT]);
    $inbox->addMembers([$agent->id]);

    return $agent;
}

/**
 * Tệp như trình duyệt gửi lên: loại tệp lấy từ `File.type` của bản ghi. `UploadedFile::fake()`
 * đoán theo đuôi nên `.webm` thành `video/webm`, không giống bản ghi âm thật.
 */
function browserRecordingUpload(string $filename, string $contentType): UploadedFile
{
    $path = tempnam(sys_get_temp_dir(), 'voice-recording-');
    file_put_contents($path, random_bytes(2048));

    return new UploadedFile($path, $filename, $contentType, null, true);
}

/** @return list<array<string, mixed>> */
function voiceOutboundBridgeSends(): array
{
    return collect(Http::recorded())
        ->map(fn (array $pair) => $pair[0])
        ->filter(fn (ClientRequest $request) => str_ends_with($request->url(), '/personal-messages/send'))
        ->map(fn (ClientRequest $request) => $request->data())
        ->values()
        ->all();
}

beforeEach(function () {
    Storage::fake('public');
    Http::fake([
        zaloBridgePattern('personal-messages/send') => Http::response(['ok' => true, 'source_id' => 'sent-voice-1']),
        zaloBridgePattern('*') => Http::response(['ok' => true]),
    ]);
    $this->inbox = Inbox::factory()->zalo()->create();
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->inbox->account_id,
        'inbox_id' => $this->inbox->id,
        'additional_attributes' => ['thread_id' => '9876543210', 'thread_type' => 0],
    ]);
    $this->messagesUrl = "/api/v1/accounts/{$this->inbox->account_id}/conversations/{$this->conversation->display_id}/messages";
});

it('Zalo khai tin thoại gốc', function () {
    expect($this->inbox->channel->capabilities()->has(Capability::OutboundVoice))->toBeTrue();
});

it('bản ghi âm gửi từ ô soạn tới bridge là tin thoại, kèm tên và loại tệp thật', function () {
    $recording = browserRecordingUpload('voice-message-20260929-101500.webm', 'audio/webm');

    $response = $this->actingAs(voiceOutboundAgent($this->inbox))->post($this->messagesUrl, [
        'attachments' => [$recording],
        'is_voice_message' => '1',
        'private' => '0',
    ])->assertOk();

    $message = Message::findOrFail($response->json('id'));
    $attachment = $message->attachments()->sole();
    $sends = voiceOutboundBridgeSends();

    expect($attachment->isVoiceMessage())->toBeTrue()
        ->and($sends)->toHaveCount(1)
        ->and($sends[0]['media_kind'])->toBe('voice')
        ->and($sends[0]['filename'])->toBe('voice-message-20260929-101500.webm')
        ->and($sends[0]['content_type'])->toBe('audio/webm')
        ->and($sends[0]['file_url'])->toStartWith(url("/attachments/{$attachment->id}/"))
        ->and($message->refresh()->source_id)->toBe('sent-voice-1')
        ->and($message->statusName())->not->toBe('failed');
});

it('bản ghi âm kèm chữ: tin thoại đi trước, chữ thành tin chữ riêng ngay sau', function () {
    $this->actingAs(voiceOutboundAgent($this->inbox))->post($this->messagesUrl, [
        'content' => 'Shop gửi lời nhắn nha',
        'attachments' => [browserRecordingUpload('voice-message-20260929-101500.m4a', 'audio/mp4')],
        'is_voice_message' => '1',
        'private' => '0',
    ])->assertOk();

    $sends = voiceOutboundBridgeSends();

    expect($sends)->toHaveCount(2)
        ->and($sends[0]['media_kind'])->toBe('voice')
        ->and($sends[0])->not->toHaveKey('text')
        ->and($sends[1]['text'])->toBe('Shop gửi lời nhắn nha')
        ->and($sends[1])->not->toHaveKey('file_url');
});

it('tệp âm thanh tải lên (không phải bản ghi âm) vẫn gửi dạng tệp âm thanh', function () {
    $this->actingAs(voiceOutboundAgent($this->inbox))->post($this->messagesUrl, [
        'attachments' => [UploadedFile::fake()->create('nhac-cho.mp3', 64, 'audio/mpeg')],
        'private' => '0',
    ])->assertOk();

    $sends = voiceOutboundBridgeSends();

    expect($sends)->toHaveCount(1)
        ->and($sends[0]['media_kind'])->toBe('audio');
});

it('cờ bản ghi âm không biến tệp không phải âm thanh thành tin thoại', function () {
    $this->actingAs(voiceOutboundAgent($this->inbox))->post($this->messagesUrl, [
        'attachments' => [UploadedFile::fake()->create('bao-gia.pdf', 20, 'application/pdf')],
        'is_voice_message' => '1',
        'private' => '0',
    ])->assertOk();

    expect(voiceOutboundBridgeSends()[0]['media_kind'])->toBe('file')
        ->and(Attachment::query()->sole()->isVoiceMessage())->toBeFalse();
});

it('kênh không khai tin thoại (Telegram) nhận bản ghi âm như tệp âm thanh', function () {
    $telegram = Inbox::factory()->telegram()->create();

    expect($telegram->channel->capabilities()->has(Capability::OutboundVoice))->toBeFalse()
        ->and($telegram->channel->capabilities()->has(Capability::OutboundAudio))->toBeTrue();
});
