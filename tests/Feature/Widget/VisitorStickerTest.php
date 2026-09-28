<?php

use App\Channels\Capability;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Services\Channels\ChannelActionRegistry;
use App\Services\Channels\Stickers\StickerLibrary;
use Illuminate\Support\Facades\Storage;
use Tests\Support\WidgetSession;
use Tests\Support\YonaStickers;

// Khách gửi sticker từ widget: client đưa MÃ sticker, máy chủ tra kho sticker Yona
// rồi dựng tin sticker (payload lưu đường dẫn, đính kèm là ảnh PNG mượn của kho).

beforeEach(function () {
    Storage::fake(Sticker::DISK);
    $this->session = WidgetSession::make(contactAttributes: ['email' => null]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->session->account->id,
        'inbox_id' => $this->session->inbox->id,
        'contact_id' => $this->session->contactInbox->contact_id,
        'contact_inbox_id' => $this->session->contactInbox->id,
    ]);
    $this->pack = StickerPack::factory()->create(['position' => 1]);
    $this->waving = YonaStickers::ready($this->pack, ['label' => 'Chó vẫy tay', 'keywords' => ['chào', 'hi'], 'position' => 1]);
    $this->thanks = YonaStickers::ready($this->pack, ['label' => 'Mèo cảm ơn', 'position' => 2]);
});

it('kênh widget khai inbound_sticker và dùng kho sticker Yona, không có danh mục nền tảng', function () {
    expect($this->session->inbox->supports(Capability::InboundSticker))->toBeTrue()
        ->and(ChannelActionRegistry::stickers($this->session->inbox))->toBeNull()
        ->and(app(StickerLibrary::class)->listing($this->session->inbox, Capability::InboundSticker))->toHaveCount(2);
});

it('cấu hình widget lộ danh sách sticker account thấy được kèm từ khoá để lọc gợi ý tại chỗ, bỏ sticker chưa xong hoặc bộ chưa xuất bản', function () {
    Sticker::factory()->processing()->for($this->pack, 'stickerPack')->create();
    YonaStickers::ready(StickerPack::factory()->unpublished()->create());
    YonaStickers::ready(YonaStickers::tenantPack($this->session->account));

    $config = $this->postJson($this->session->url('config'), [], $this->session->headers())->assertOk()->json();

    expect($config['website_channel_config']['stickers'])->toBe([
        ['id' => "yona:{$this->waving->id}", 'image_url' => $this->waving->poster_url, 'pack_id' => "yona:{$this->pack->id}", 'label' => 'Chó vẫy tay', 'keywords' => ['chào', 'hi']],
        ['id' => "yona:{$this->thanks->id}", 'image_url' => $this->thanks->poster_url, 'pack_id' => "yona:{$this->pack->id}", 'label' => 'Mèo cảm ơn', 'keywords' => []],
    ]);
});

it('kho chưa có sticker nào thì danh sách rỗng', function () {
    Sticker::query()->delete();

    $config = $this->postJson($this->session->url('config'), [], $this->session->headers())->assertOk()->json();

    expect($config['website_channel_config']['stickers'])->toBe([]);
});

it('khách gửi sticker theo mã: tin sticker có payload và ảnh do máy chủ dựng', function () {
    $response = $this->postJson($this->session->url('messages'), [
        'message' => ['content_type' => 'sticker', 'content_attributes' => ['sticker' => "yona:{$this->waving->id}"]],
    ], $this->session->headers())->assertOk();

    $message = $this->conversation->messages()->incoming()->reorder('id', 'desc')->first();
    $attachment = $message->attachments->first();

    expect($message->contentTypeName())->toBe('sticker')
        ->and($message->content)->toBeNull()
        ->and($message->content_attributes)->toBe(['sticker' => YonaStickers::storedPayload($this->waving)])
        ->and($message->attachments)->toHaveCount(1)
        ->and($attachment->file_type)->toBe(Attachment::FILE_TYPE_IMAGE)
        ->and($attachment->disk)->toBe(Sticker::DISK)
        ->and($attachment->path)->toBe($this->waving->static_path)
        ->and($attachment->content_type)->toBe('image/png')
        ->and($attachment->external_url)->toBeNull()
        ->and($response->json('content_type'))->toBe('sticker')
        ->and($response->json('content_attributes.sticker'))->toBe(YonaStickers::readerPayload($this->waving))
        ->and($response->json('attachments'))->toHaveCount(1);

    $listed = collect($this->getJson($this->session->url('messages'), $this->session->headers())->json('payload'))
        ->firstWhere('id', $message->id);

    expect($listed['content_type'])->toBe('sticker')
        ->and($listed['content_attributes']['sticker'])->toBe(YonaStickers::readerPayload($this->waving))
        ->and($listed['status'])->toBe('sent');
});

it('từ chối sticker không có trong kho account thấy được và không tạo tin', function (Closure $stickerId, string $reason) {
    $this->postJson($this->session->url('messages'), [
        'message' => ['content_type' => 'sticker', 'content_attributes' => ['sticker' => $stickerId()]],
    ], $this->session->headers())
        ->assertStatus(422)
        ->assertExactJson(['message' => __("errors.stickers.{$reason}")]);

    expect($this->conversation->messages()->incoming()->count())->toBe(0);
})->with([
    'mã lạ' => [fn () => 'khong-co', 'not_found'],
    'mã kho không tồn tại' => [fn () => 'yona:999999999', 'not_found'],
    'URL ngoài thay cho mã' => [fn () => 'https://evil.example/x.png', 'not_found'],
    'sticker thuộc bộ chưa xuất bản' => [fn () => 'yona:'.YonaStickers::ready(StickerPack::factory()->unpublished()->create())->id, 'not_found'],
    'thiếu mã' => [fn () => null, 'missing_sticker_id'],
]);
