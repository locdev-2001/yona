<?php

use App\Http\Resources\MessageResource;
use App\Http\Resources\Widget\WidgetMessageResource;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Services\Channels\Stickers\StickerLibrary;
use App\Services\Stickers\StickerLibraryManager;
use App\Services\Stickers\YonaStickerCatalog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\Support\YonaStickers;

// Sticker chuyển từ Lottie sang ảnh: dữ liệu cũ (hàng stickers, tin đã gửi mang
// payload Lottie, đính kèm mượn ảnh tĩnh) vẫn hiện ảnh như tin gửi theo payload mới.

const LEGACY_STICKERS_MIGRATION = 'database/migrations/2026_09_28_140000_convert_stickers_to_images.php';

function legacyStickerMessage(Conversation $conversation, array $payload): Message
{
    $message = $conversation->messages()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'message_type' => Message::TYPE_OUTGOING,
        'content_type' => Message::CONTENT_TYPES['sticker'],
        'content_attributes' => ['sticker' => $payload],
    ]);
    $message->attachments()->create([
        'account_id' => $conversation->account_id,
        'file_type' => Attachment::FILE_TYPE_IMAGE,
        'disk' => Sticker::DISK,
        'path' => $payload['static_path'],
        'filename' => "sticker-{$payload['id']}.png",
        'content_type' => 'image/png',
    ]);

    return $message->fresh();
}

beforeEach(function () {
    $this->disk = Storage::fake(Sticker::DISK);
    $this->inbox = Inbox::factory()->webWidget()->create();
    $this->conversation = Conversation::factory()->create(['account_id' => $this->inbox->account_id, 'inbox_id' => $this->inbox->id]);
});

describe('migration chuyển bảng stickers', function () {
    beforeEach(function () {
        $this->migration = require base_path(LEGACY_STICKERS_MIGRATION);
        $this->migration->down();
        $this->pack = StickerPack::factory()->create();
        $this->insertLottieSticker = function (string $status, string $hash, bool $rendered) {
            $directory = substr($hash, 0, 2).'/'.$hash;

            return DB::table('stickers')->insertGetId([
                'sticker_pack_id' => $this->pack->id,
                'label' => 'Lottie',
                'keywords' => '[]',
                'animation_path' => $rendered ? "{$directory}/anim.json" : null,
                'poster_path' => $rendered ? "{$directory}/poster.webp" : null,
                'static_path' => $rendered ? "{$directory}/static.png" : null,
                'content_hash' => $hash,
                'width' => 512,
                'height' => 512,
                'frame_count' => 90,
                'duration_ms' => 3000,
                'byte_size' => 24_000,
                'status' => $status,
                'failure_code' => $status === Sticker::STATUS_FAILED ? 'text_not_allowed' : null,
                'position' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        };
    });

    it('sticker đã dựng lấy ảnh tĩnh làm ảnh hiển thị; sticker chưa dựng xong thành hỏng; bỏ cột Lottie', function () {
        $readyId = ($this->insertLottieSticker)(Sticker::STATUS_READY, str_repeat('a', 64), rendered: true);
        $processingId = ($this->insertLottieSticker)(Sticker::STATUS_PROCESSING, str_repeat('b', 64), rendered: false);
        $failedId = ($this->insertLottieSticker)(Sticker::STATUS_FAILED, str_repeat('c', 64), rendered: false);

        $this->migration->up();

        $ready = Sticker::query()->findOrFail($readyId);
        expect(Schema::hasColumns('stickers', ['animation_path', 'poster_path']))->toBeFalse()
            ->and(Schema::hasColumns('stickers', ['image_path', 'original_path', 'edit_params']))->toBeTrue()
            ->and($ready->only(['status', 'image_path', 'static_path', 'original_path', 'edit_params', 'frame_count', 'duration_ms']))->toBe([
                'status' => Sticker::STATUS_READY,
                'image_path' => 'aa/'.str_repeat('a', 64).'/static.png',
                'static_path' => 'aa/'.str_repeat('a', 64).'/static.png',
                'original_path' => null,
                'edit_params' => null,
                'frame_count' => 1,
                'duration_ms' => 0,
            ])
            ->and(Sticker::query()->findOrFail($processingId)->only(['status', 'failure_code']))
            ->toBe(['status' => Sticker::STATUS_FAILED, 'failure_code' => 'unsupported_file_type'])
            ->and(Sticker::query()->findOrFail($failedId)->only(['status', 'failure_code']))
            ->toBe(['status' => Sticker::STATUS_FAILED, 'failure_code' => 'unsupported_file_type']);
    });

    it('sticker processing sau migration để trống số khung, thời lượng, dung lượng tới khi dựng xong', function () {
        $this->migration->up();

        expect(Sticker::factory()->processing()->create()->fresh()->only(['frame_count', 'duration_ms', 'byte_size']))
            ->toBe(['frame_count' => null, 'duration_ms' => null, 'byte_size' => null]);
    });
});

describe('tin đã gửi mang payload Lottie', function () {
    beforeEach(function () {
        $this->legacy = YonaStickers::legacyLottie();
        $this->legacyMessage = legacyStickerMessage($this->conversation, YonaStickers::legacyStoredPayload($this->legacy));
        $this->currentMessage = legacyStickerMessage($this->conversation, YonaStickers::storedPayload($this->legacy));
        $this->staticUrl = Storage::disk(Sticker::DISK)->url($this->legacy->static_path);
    });

    it('hộp thư và widget đọc ra image_url và url là ảnh tĩnh, như tin payload mới của cùng sticker', function (Closure $read) {
        $legacy = $read($this->legacyMessage);
        $current = $read($this->currentMessage);

        expect($legacy['image_url'])->toBe($this->staticUrl)
            ->and($legacy['url'])->toBe($this->staticUrl)
            ->and(array_intersect_key($legacy, array_flip(['source', 'id', 'pack_id', 'image_url', 'url', 'static_path'])))
            ->toBe(array_intersect_key($current, array_flip(['source', 'id', 'pack_id', 'image_url', 'url', 'static_path'])))
            ->and($legacy)->not->toHaveKeys(['animation_url', 'poster_url']);
    })->with([
        'hộp thư' => [fn (Message $message) => MessageResource::pushEventData($message)['content_attributes']['sticker']],
        'widget' => [fn (Message $message) => WidgetMessageResource::listItem($message)['content_attributes']['sticker']],
    ]);

    it('bảng chọn "gần đây" dựng lại được sticker từ tin cũ với ảnh tĩnh', function () {
        $this->currentMessage->delete();

        $recent = app(StickerLibrary::class)->browse($this->inbox, null, null)['stickers'];

        expect($recent)->toBe([[
            'id' => YonaStickerCatalog::ID_PREFIX.$this->legacy->id,
            'image_url' => $this->staticUrl,
            'pack_id' => YonaStickerCatalog::ID_PREFIX.$this->legacy->sticker_pack_id,
            'label' => null,
        ]]);
    });

    it('xoá sticker hay cả bộ không làm mất đính kèm và ảnh tĩnh của tin cũ', function (Closure $remove) {
        $remove(app(StickerLibraryManager::class), $this->legacy);

        $attachment = $this->legacyMessage->attachments()->sole();
        expect($attachment->path)->toBe($this->legacy->static_path)
            ->and($this->disk->exists($attachment->path))->toBeTrue()
            ->and(MessageResource::pushEventData($this->legacyMessage->fresh())['content_attributes']['sticker']['image_url'])->toBe($this->staticUrl);
    })->with([
        'xoá sticker' => [fn (StickerLibraryManager $library, Sticker $sticker) => $library->deleteSticker($sticker)],
        'xoá bộ' => [fn (StickerLibraryManager $library, Sticker $sticker) => $library->deletePack($sticker->stickerPack)],
    ]);

    it('khi không còn tin nào mượn thì dọn cả thư mục, gồm tệp Lottie cũ', function () {
        Message::query()->whereKey([$this->legacyMessage->id, $this->currentMessage->id])->get()->each->delete();
        Attachment::query()->where('disk', Sticker::DISK)->delete();

        app(StickerLibraryManager::class)->deleteSticker($this->legacy);

        expect($this->disk->allFiles())->toBe([]);
    });
});

it('xoá sticker sau khi đổi cỡ vẫn giữ tệp cỡ cũ mà tin đã gửi còn mượn', function () {
    config(['yona.stickers.outbound_image_size' => 64]);
    $sticker = YonaStickers::ready();
    $oldStatic = $sticker->static_path;
    $this->disk->put($oldStatic, 'png-64');
    legacyStickerMessage($this->conversation, ['id' => $sticker->id, 'static_path' => $oldStatic]);

    config(['yona.stickers.outbound_image_size' => 128]);
    app(StickerLibraryManager::class)->deleteSticker($sticker);

    expect($oldStatic)->toEndWith('/static-64.png')
        ->and($this->disk->exists($oldStatic))->toBeTrue();
});
