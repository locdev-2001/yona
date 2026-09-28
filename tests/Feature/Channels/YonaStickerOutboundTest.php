<?php

use App\Builders\Messages\MessageBuilder;
use App\Exceptions\MessageValidationException;
use App\Http\Resources\MessageResource;
use App\Jobs\SendReplyJob;
use App\Mail\ConversationReplyMail;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\Sticker;
use App\Models\User;
use App\Services\Channels\Stickers\StickerLibrary;
use App\Services\Facebook\SendOnFacebookService;
use App\Services\Messages\Forwarding\ForwardBlock;
use App\Services\Messages\Forwarding\ForwardException;
use App\Services\Messages\Forwarding\ForwardRequirements;
use App\Services\Messages\Forwarding\MessageForwarder;
use App\Services\Telegram\SendOnTelegramService;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\Support\YonaStickers;

// Sticker của kho Yona ra mọi kênh ngoài là MỘT ảnh PNG tĩnh (đính kèm mượn của
// kho), đi đúng đường gửi ảnh sẵn có của từng driver. Zalo chỉ dùng lệnh sticker
// gốc cho sticker của chính Zalo.

const YONA_OUTBOUND_ZALO_STICKER_URL = 'https://zalo-api.zadn.vn/api/emoticon/sticker/webpc?eid=98930&size=130';

function yonaOutboundAgent(Inbox $inbox): User
{
    $agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $inbox->account_id, 'user_id' => $agent->id, 'role' => AccountUser::ROLE_AGENT]);
    $inbox->addMembers([$agent->id]);

    return $agent;
}

function yonaOutboundConversation(Inbox $inbox, array $additionalAttributes = []): Conversation
{
    return Conversation::factory()->create([
        'account_id' => $inbox->account_id,
        'inbox_id' => $inbox->id,
        'additional_attributes' => $additionalAttributes,
    ]);
}

function yonaOutboundSticker(Conversation $conversation, string $stickerId): Message
{
    return (new MessageBuilder(yonaOutboundAgent($conversation->inbox), $conversation, [
        'content_type' => 'sticker',
        'sticker_id' => $stickerId,
    ]))->perform();
}

function fakeYonaOutboundZaloBridge(): void
{
    Http::fake([
        zaloBridgePattern('personal-messages/stickers/search') => Http::response(['ok' => true, 'stickers' => [
            ['id' => 98930, 'cate_id' => 61900, 'type' => 7, 'url' => YONA_OUTBOUND_ZALO_STICKER_URL, 'label' => 'chào'],
        ]]),
        zaloBridgePattern('personal-messages/send') => Http::response(['ok' => true, 'source_id' => 'sent-yona-sticker']),
        zaloBridgePattern('*') => Http::response(['ok' => true]),
    ]);
}

/** @return list<ClientRequest> */
function yonaOutboundRequests(string $needle): array
{
    return collect(Http::recorded())
        ->map(fn (array $pair) => $pair[0])
        ->filter(fn (ClientRequest $request) => str_contains($request->url(), $needle))
        ->values()
        ->all();
}

function expectYonaStickerImage(string $url, Message $message): void
{
    $attachment = $message->attachments()->sole();

    expect($url)->toStartWith(url("/attachments/{$attachment->id}/"))
        ->and($url)->toEndWith("/{$attachment->filename}");
}

beforeEach(function () {
    Storage::fake(Sticker::DISK);
    $this->sticker = YonaStickers::ready(attributes: ['label' => 'chào bạn']);
});

describe('Zalo', function () {
    beforeEach(function () {
        $this->inbox = Inbox::factory()->zalo()->create();
        $this->conversation = yonaOutboundConversation($this->inbox, ['thread_id' => '9876543210', 'thread_type' => 0]);
    });

    it('bảng chọn có cả sticker Yona lẫn sticker Zalo, Yona trước', function () {
        fakeYonaOutboundZaloBridge();

        $found = app(StickerLibrary::class)->browse($this->inbox, 'chào', null);
        $recent = app(StickerLibrary::class)->browse($this->inbox, null, null);

        expect(array_column($found['stickers'], 'id'))->toBe(["yona:{$this->sticker->id}", '98930'])
            ->and($recent['packs'])->toBe([['id' => "yona:{$this->sticker->sticker_pack_id}", 'cover_url' => $this->sticker->image_url]]);
    });

    it('gửi sticker Yona thì bridge nhận lệnh gửi ảnh PNG, không nhận lệnh sticker', function () {
        fakeYonaOutboundZaloBridge();

        $response = $this->actingAs(yonaOutboundAgent($this->inbox))->postJson(
            "/api/v1/accounts/{$this->inbox->account_id}/conversations/{$this->conversation->display_id}/messages",
            ['content_type' => 'sticker', 'sticker_id' => "yona:{$this->sticker->id}"],
        )->assertOk();

        $message = Message::findOrFail($response->json('id'));
        $sends = yonaOutboundRequests('/personal-messages/send');

        expect($message->content_attributes['sticker'])->toBe(YonaStickers::storedPayload($this->sticker))
            ->and($response->json('content_attributes.sticker'))->toBe(YonaStickers::readerPayload($this->sticker))
            ->and($sends)->toHaveCount(1)
            ->and($sends[0]->data())->not->toHaveKey('sticker')
            ->and($sends[0]->data())->not->toHaveKey('text')
            ->and($sends[0]['media_kind'])->toBe('image')
            ->and($sends[0]['filename'])->toBe("sticker-{$this->sticker->id}.png")
            ->and($sends[0]['content_type'])->toBe('image/png')
            ->and($message->refresh()->source_id)->toBe('sent-yona-sticker');

        expectYonaStickerImage($sends[0]['file_url'], $message);
    });

    it('thu hồi rồi xoá tin sticker Yona không xoá tệp trong kho', function () {
        fakeYonaOutboundZaloBridge();
        $message = yonaOutboundSticker($this->conversation, "yona:{$this->sticker->id}");

        $message->fresh()->markDeleted();
        Message::query()->whereKey($message->id)->first()->delete();

        Storage::disk(Sticker::DISK)->assertExists($this->sticker->static_path);
        Storage::disk(Sticker::DISK)->assertExists($this->sticker->image_path);
        Storage::disk(Sticker::DISK)->assertExists($this->sticker->original_path);
    });
});

describe('widget', function () {
    it('agent gửi sticker Yona tới khách widget', function () {
        Queue::fake();
        $conversation = yonaOutboundConversation(Inbox::factory()->webWidget()->create());

        $message = yonaOutboundSticker($conversation, "yona:{$this->sticker->id}");

        expect($message->content_type)->toBe(Message::CONTENT_TYPES['sticker'])
            ->and($message->content)->toBeNull()
            ->and($message->content_attributes)->toBe(['sticker' => YonaStickers::storedPayload($this->sticker)])
            ->and($message->attachments()->sole()->only(['disk', 'path', 'content_type']))
            ->toBe(['disk' => Sticker::DISK, 'path' => $this->sticker->static_path, 'content_type' => 'image/png'])
            ->and(MessageResource::pushEventData($message->fresh())['content_attributes']['sticker'])
            ->toBe(YonaStickers::readerPayload($this->sticker));
    });
});

describe('kênh chỉ nhận ảnh', function () {
    beforeEach(fn () => Queue::fake());

    it('Facebook gửi sticker Yona như một tin ảnh', function () {
        Http::fake(['graph.facebook.com/*' => Http::response(['message_id' => 'mid.sticker'])]);
        $message = yonaOutboundSticker(yonaOutboundConversation(Inbox::factory()->facebookPage()->create()), "yona:{$this->sticker->id}");

        (new SendOnFacebookService($message->fresh()))->perform();

        $sends = yonaOutboundRequests('/me/messages');

        expect($sends)->toHaveCount(1)
            ->and($sends[0]['message']['attachment']['type'])->toBe('image');

        expectYonaStickerImage($sends[0]['message']['attachment']['payload']['url'], $message);
    });

    it('Telegram gửi sticker Yona như một tin ảnh', function () {
        Http::fake(['api.telegram.org/*' => Http::response(['ok' => true, 'result' => [['message_id' => 77]]])]);
        $message = yonaOutboundSticker(yonaOutboundConversation(Inbox::factory()->telegram()->create(), ['chat_id' => 23]), "yona:{$this->sticker->id}");

        (new SendOnTelegramService($message->fresh()))->perform();

        $groups = yonaOutboundRequests('/sendMediaGroup');
        $media = json_decode($groups[0]['media'], true);

        expect(yonaOutboundRequests('/sendMessage'))->toBe([])
            ->and($groups)->toHaveCount(1)
            ->and($media)->toHaveCount(1)
            ->and($media[0]['type'])->toBe('photo');

        expectYonaStickerImage($media[0]['media'], $message);
    });

    it('các kênh nhận ảnh khác gửi sticker Yona thành đúng một tin ảnh, không kèm tin chữ rỗng', function (Closure $makeInbox) {
        Http::fake(['*' => Http::response(['id' => 'sent', 'message_id' => 'sent', 'messages' => [['id' => 'sent']], 'sid' => 'SMsent'])]);
        $message = yonaOutboundSticker(yonaOutboundConversation($makeInbox()), "yona:{$this->sticker->id}");
        $attachment = $message->attachments()->sole();

        (new SendReplyJob($message->fresh()))->handle();

        $sends = collect(Http::recorded())->map(fn (array $pair) => str_replace('\\/', '/', urldecode($pair[0]->body())));
        expect($sends)->toHaveCount(1)
            ->and($sends[0])->toContain(url("/attachments/{$attachment->id}/"))
            ->and($sends[0])->toContain("/{$attachment->filename}");
    })->with([
        'Instagram' => [fn () => Inbox::factory()->instagram()->create()],
        'LINE' => [fn () => Inbox::factory()->line()->create()],
        'WhatsApp' => [fn () => Inbox::factory()->whatsapp()->create()],
        'Twilio WhatsApp' => [function () {
            $inbox = Inbox::factory()->twilioSms()->create();
            $inbox->channel->update(['medium' => 'whatsapp']);

            return $inbox->fresh();
        }],
    ]);

    it('kênh không khai outbound_image thì không có kho sticker', function (Closure $makeInbox) {
        $conversation = yonaOutboundConversation($makeInbox());

        expect(fn () => yonaOutboundSticker($conversation, "yona:{$this->sticker->id}"))
            ->toThrow(MessageValidationException::class, __('errors.stickers.capability_not_supported', [], Account::find($conversation->account_id)->locale));
    })->with([
        'TikTok' => [fn () => Inbox::factory()->tiktok()->create()],
        'Twilio SMS' => [fn () => Inbox::factory()->twilioSms()->create()],
    ]);

    it('Email đính kèm ảnh PNG của sticker vào thư', function () {
        $inbox = Inbox::factory()->email()->create();
        $inbox->channel->update(['smtp_enabled' => true, 'smtp_address' => 'smtp.acme.test', 'smtp_port' => 587]);
        $message = yonaOutboundSticker(yonaOutboundConversation($inbox), "yona:{$this->sticker->id}");

        ConversationReplyMail::emailReply($message->fresh())->assertHasAttachedData(
            Storage::disk(Sticker::DISK)->get($this->sticker->static_path),
            "sticker-{$this->sticker->id}.png",
            ['mime' => 'image/png'],
        );
    });

    it('kênh không gửi được ảnh thì không có kho sticker', function () {
        $conversation = yonaOutboundConversation(Inbox::factory()->sms()->create());
        $account = Account::find($conversation->account_id);

        expect(fn () => yonaOutboundSticker($conversation, "yona:{$this->sticker->id}"))
            ->toThrow(MessageValidationException::class, __('errors.stickers.capability_not_supported', [], $account->locale));
    });
});

describe('chuyển tiếp', function () {
    beforeEach(function () {
        Queue::fake();
        $this->source = yonaOutboundSticker(yonaOutboundConversation(Inbox::factory()->webWidget()->create()), "yona:{$this->sticker->id}");
    });

    it('sticker Yona sang hộp thư chỉ có outbound_image được, đính kèm vẫn là tệp mượn', function () {
        $target = yonaOutboundConversation(Inbox::factory()->facebookPage()->create(['account_id' => $this->source->account_id]));

        expect(ForwardRequirements::check($this->source, $target, 'vi'))->toBeNull()
            ->and(array_map(fn ($capability) => $capability->value, ForwardRequirements::capabilitiesFor($this->source)))->toBe(['outbound_image']);

        $forwarded = (new MessageForwarder)->forward($this->source->fresh(), $target, User::factory()->create());

        expect($forwarded->content_attributes['sticker'])->toBe(YonaStickers::storedPayload($this->sticker))
            ->and($forwarded->attachments()->sole()->only(['disk', 'path']))
            ->toBe(['disk' => Sticker::DISK, 'path' => $this->sticker->static_path])
            ->and(Storage::disk(Sticker::DISK)->allFiles())->toHaveCount(3);
    });

    it('sticker Yona account không còn thấy bị chặn ngay ở danh sách đích, không hứa rồi gửi hỏng', function (Closure $hide) {
        $target = yonaOutboundConversation(Inbox::factory()->facebookPage()->create(['account_id' => $this->source->account_id]));
        $hide($this->sticker);

        expect(ForwardRequirements::check($this->source->fresh(), $target->fresh(), 'vi')?->code)->toBe(ForwardBlock::STICKER_UNAVAILABLE)
            ->and(fn () => (new MessageForwarder)->forward($this->source->fresh(), $target->fresh(), User::factory()->create()))
            ->toThrow(fn (ForwardException $exception) => expect($exception->block->code)->toBe(ForwardBlock::STICKER_UNAVAILABLE));
    })->with([
        'bộ bị gỡ xuất bản' => [fn (Sticker $sticker) => $sticker->stickerPack->update(['published_at' => null])],
        'sticker không còn sẵn sàng' => [fn (Sticker $sticker) => $sticker->update(['status' => Sticker::STATUS_FAILED])],
    ]);

    it('sticker kho riêng chuyển tiếp được trong chính account, dù cờ custom_stickers tắt', function () {
        $account = $this->source->account;
        $own = YonaStickers::ready(YonaStickers::tenantPack($account));
        $source = yonaOutboundSticker($this->source->conversation()->sole(), "yona:{$own->id}");
        $target = yonaOutboundConversation(Inbox::factory()->facebookPage()->create(['account_id' => $account->id]));

        expect($account->featureEnabled(Sticker::CUSTOM_STICKERS_FEATURE))->toBeFalse()
            ->and(ForwardRequirements::check($source->fresh(), $target->fresh(), 'vi'))->toBeNull();
    });

    it('sticker Yona sang hộp thư không nhận ảnh bị chặn vì thiếu outbound_image', function () {
        $target = yonaOutboundConversation(Inbox::factory()->sms()->create(['account_id' => $this->source->account_id]));

        $block = ForwardRequirements::check($this->source, $target, 'vi');

        expect($block?->code)->toBe(ForwardBlock::CAPABILITY_NOT_SUPPORTED)
            ->and($block?->missingCapabilities)->toBe(['outbound_image']);
    });

    it('sticker Zalo sang email vẫn bị chặn vì thiếu outbound_sticker', function () {
        $zaloConversation = yonaOutboundConversation(Inbox::factory()->zalo()->create(['account_id' => $this->source->account_id]));
        $zaloSticker = $zaloConversation->messages()->create([
            'account_id' => $zaloConversation->account_id,
            'inbox_id' => $zaloConversation->inbox_id,
            'message_type' => Message::TYPE_INCOMING,
            'content_type' => Message::CONTENT_TYPES['sticker'],
            'content_attributes' => ['sticker' => ['id' => 98930, 'catId' => 61900, 'type' => 7, 'url' => YONA_OUTBOUND_ZALO_STICKER_URL]],
        ]);
        $zaloSticker->attachments()->create(['account_id' => $zaloSticker->account_id, 'file_type' => Attachment::FILE_TYPE_IMAGE, 'external_url' => YONA_OUTBOUND_ZALO_STICKER_URL]);
        $target = yonaOutboundConversation(Inbox::factory()->email()->create(['account_id' => $this->source->account_id]));

        $block = ForwardRequirements::check($zaloSticker->fresh(), $target, 'vi');

        expect($block?->code)->toBe(ForwardBlock::CAPABILITY_NOT_SUPPORTED)
            ->and($block?->missingCapabilities)->toBe(['outbound_sticker']);
    });
});
