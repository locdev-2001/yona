<?php

use App\Messaging\Inbound\AttachmentKind;
use App\Messaging\Inbound\InboundAttachment;
use App\Messaging\Inbound\InboundAttachmentFactory;
use App\Models\Attachment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Channels\ChannelFixture;

beforeEach(function () {
    Storage::fake('public');
    $this->factory = new InboundAttachmentFactory;
});

it('tải tệp về và suy loại theo MIME khi kênh chỉ báo "tệp"', function () {
    Http::fake(['cdn.test/*' => Http::response(ChannelFixture::jpegBytes(), 200, ['Content-Type' => 'application/octet-stream'])]);

    $attachment = $this->factory->build(InboundAttachment::download('https://cdn.test/a.bin'), 1);

    expect($attachment->file_type)->toBe(Attachment::FILE_TYPE_IMAGE)
        ->and($attachment->external_url)->toBe('https://cdn.test/a.bin')
        ->and($attachment->path)->not->toBeNull();
});

it('kênh báo loại cụ thể thì theo kênh, không theo MIME', function () {
    Http::fake(['cdn.test/*' => Http::response(ChannelFixture::jpegBytes(), 200, ['Content-Type' => 'image/jpeg'])]);

    $attachment = $this->factory->build(InboundAttachment::download('https://cdn.test/v', AttachmentKind::Video), 1);

    expect($attachment->file_type)->toBe(Attachment::FILE_TYPE_VIDEO);
});

it('tải hỏng với URL công khai: fallback giữ liên kết và loại kênh báo để tự tải lại', function () {
    Http::fake(['cdn.test/*' => Http::response('', 500)]);

    $attachment = $this->factory->build(InboundAttachment::download('https://cdn.test/anh.jpg', AttachmentKind::Image), 1);

    expect($attachment->file_type)->toBe(Attachment::FILE_TYPE_FALLBACK)
        ->and($attachment->external_url)->toBe('https://cdn.test/anh.jpg')
        ->and($attachment->fallback_title)->toBe('anh.jpg')
        ->and($attachment->meta[Attachment::META_DOWNLOAD_RETRY]['reported_file_type'])->toBe(Attachment::FILE_TYPE_IMAGE);
});

it('tải hỏng với URL cần token: fallback không lộ liên kết', function () {
    Http::fake(['api.test/*' => Http::response('', 500)]);

    $attachment = $this->factory->build(
        InboundAttachment::download('https://api.test/file/bot123/x.pdf', AttachmentKind::File, 'x.pdf', headers: ['Authorization' => 'Bearer t']),
        1,
    );

    expect($attachment->file_type)->toBe(Attachment::FILE_TYPE_FALLBACK)
        ->and($attachment->external_url)->toBeNull()
        ->and($attachment->fallback_title)->toBe('x.pdf');
});

it('đính kèm ngoài không tải, trỏ thẳng CDN', function () {
    Http::fake();

    $attachment = $this->factory->build(InboundAttachment::external('https://cdn.test/s.webp', AttachmentKind::Image), 1);

    expect($attachment->external_url)->toBe('https://cdn.test/s.webp')
        ->and($attachment->file_type)->toBe(Attachment::FILE_TYPE_IMAGE)
        ->and($attachment->path)->toBeNull();
    Http::assertNothingSent();
});

it('tin thoại mang cờ is_voice_message', function () {
    Http::fake(['cdn.test/*' => Http::response('RIFF....WAVE', 200, ['Content-Type' => 'audio/ogg'])]);

    $attachment = $this->factory->build(InboundAttachment::download('https://cdn.test/v.ogg', AttachmentKind::Voice), 1);

    expect($attachment->file_type)->toBe(Attachment::FILE_TYPE_AUDIO)
        ->and($attachment->meta[Attachment::META_VOICE_MESSAGE])->toBeTrue();
});

it('vị trí và danh thiếp không có tệp', function () {
    $location = $this->factory->build(InboundAttachment::location(10.5, 106.7, 'Quán cà phê', 'https://maps.test/x'), 1);
    $card = $this->factory->build(InboundAttachment::contactCard('+84901234567', ['first_name' => 'An', 'last_name' => null]), 1);

    expect($location->file_type)->toBe(Attachment::FILE_TYPE_LOCATION)
        ->and($location->coordinates_lat)->toBe(10.5)
        ->and($location->fallback_title)->toBe('Quán cà phê')
        ->and($card->file_type)->toBe(Attachment::FILE_TYPE_CONTACT)
        ->and($card->fallback_title)->toBe('+84901234567')
        ->and($card->meta)->toBe(['first_name' => 'An']);
});
