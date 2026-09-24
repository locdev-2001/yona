<?php

use App\Channels\Capability;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Services\Channels\ChannelActionRegistry;
use App\Services\Widget\WidgetStickerCatalog;
use Tests\Support\WidgetSession;

// Khách gửi sticker từ widget: client đưa MÃ sticker, máy chủ tra danh mục của
// kênh rồi dựng tin sticker cùng hình dạng với sticker Zalo.

const WIDGET_STICKERS = [
    ['id' => 'cho-vay-tay', 'url' => 'https://cdn.example/stickers/cho-vay-tay.png', 'pack_id' => 'cho', 'label' => 'Chó vẫy tay'],
    ['id' => 'meo-cam-on', 'url' => 'https://cdn.example/stickers/meo-cam-on.png', 'label' => 'Mèo cảm ơn'],
    ['id' => '', 'url' => 'https://cdn.example/stickers/thieu-ma.png'],
    ['id' => 'thieu-anh'],
];

beforeEach(function () {
    config(['yona.widget_stickers' => WIDGET_STICKERS]);
    $this->session = WidgetSession::make(contactAttributes: ['email' => null]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->session->account->id,
        'inbox_id' => $this->session->inbox->id,
        'contact_id' => $this->session->contactInbox->contact_id,
        'contact_inbox_id' => $this->session->contactInbox->id,
    ]);
});

it('kênh widget khai inbound_sticker và cắm danh mục sticker vào sổ driver', function () {
    expect($this->session->inbox->supports(Capability::InboundSticker))->toBeTrue()
        ->and(ChannelActionRegistry::stickers($this->session->inbox))->toBeInstanceOf(WidgetStickerCatalog::class);
});

it('cấu hình widget lộ danh sách sticker hợp lệ, bỏ mục thiếu mã hoặc ảnh', function () {
    $config = $this->postJson($this->session->url('config'), [], $this->session->headers())->assertOk()->json();

    expect($config['website_channel_config']['stickers'])->toBe([
        ['id' => 'cho-vay-tay', 'image_url' => 'https://cdn.example/stickers/cho-vay-tay.png', 'pack_id' => 'cho', 'label' => 'Chó vẫy tay'],
        ['id' => 'meo-cam-on', 'image_url' => 'https://cdn.example/stickers/meo-cam-on.png', 'pack_id' => null, 'label' => 'Mèo cảm ơn'],
    ]);
});

it('chưa cấu hình sticker thì danh sách rỗng', function () {
    config(['yona.widget_stickers' => []]);

    $config = $this->postJson($this->session->url('config'), [], $this->session->headers())->assertOk()->json();

    expect($config['website_channel_config']['stickers'])->toBe([]);
});

it('khách gửi sticker theo mã: tin sticker có payload và ảnh do máy chủ dựng', function () {
    $response = $this->postJson($this->session->url('messages'), [
        'message' => ['content_type' => 'sticker', 'content_attributes' => ['sticker' => 'cho-vay-tay']],
    ], $this->session->headers())->assertOk();

    $message = $this->conversation->messages()->incoming()->reorder('id', 'desc')->first();
    $expectedPayload = [
        'id' => 'cho-vay-tay',
        'cateId' => 'cho',
        'url' => 'https://cdn.example/stickers/cho-vay-tay.png',
        'thumbnail' => 'https://cdn.example/stickers/cho-vay-tay.png',
    ];

    expect($message->contentTypeName())->toBe('sticker')
        ->and($message->content)->toBeNull()
        ->and($message->content_attributes)->toBe(['sticker' => $expectedPayload])
        ->and($message->attachments)->toHaveCount(1)
        ->and($message->attachments->first()->file_type)->toBe(Attachment::FILE_TYPE_IMAGE)
        ->and($message->attachments->first()->external_url)->toBe('https://cdn.example/stickers/cho-vay-tay.png')
        ->and($response->json('content_type'))->toBe('sticker')
        ->and($response->json('content_attributes.sticker'))->toBe($expectedPayload)
        ->and($response->json('attachments'))->toHaveCount(1);

    $listed = collect($this->getJson($this->session->url('messages'), $this->session->headers())->json('payload'))
        ->firstWhere('id', $message->id);

    expect($listed['content_type'])->toBe('sticker')
        ->and($listed['content_attributes']['sticker'])->toBe($expectedPayload)
        ->and($listed['status'])->toBe('sent');
});

it('từ chối sticker không có trong danh mục của kênh và không tạo tin', function (mixed $stickerId, string $reason) {
    $this->postJson($this->session->url('messages'), [
        'message' => ['content_type' => 'sticker', 'content_attributes' => ['sticker' => $stickerId]],
    ], $this->session->headers())
        ->assertStatus(422)
        ->assertExactJson(['message' => __("errors.stickers.{$reason}")]);

    expect($this->conversation->messages()->incoming()->count())->toBe(0);
})->with([
    'mã lạ' => ['khong-co', 'not_found'],
    'URL ngoài thay cho mã' => ['https://evil.example/x.png', 'not_found'],
    'thiếu mã' => [null, 'missing_sticker_id'],
]);
