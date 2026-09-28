<?php

use App\Jobs\Stickers\RenderStickerJob;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Services\Stickers\StickerFileLayout;
use App\Services\Stickers\StickerRenderer;
use App\Services\Stickers\StickerUploadService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Lang;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\Support\YonaStickers;

beforeEach(function () {
    Queue::fake();
    $this->disk = Storage::fake(Sticker::DISK);
    $this->service = app(StickerUploadService::class);
    $this->pack = StickerPack::factory()->create();
    $this->rejection = function (Closure $upload): array {
        try {
            $upload();
        } catch (ValidationException $exception) {
            return $exception->errors();
        }

        throw new RuntimeException('Upload was not rejected.');
    };
});

it('lưu ảnh gốc, tạo sticker processing theo hash ảnh gốc + thông số chỉnh và xếp job dựng', function () {
    $pngBytes = YonaStickers::png(96, seed: 3);
    $edit = '{"crop":{"x":0.1,"y":0.05,"w":0.8,"h":0.8},"removeBackground":true,"tolerance":12,"feather":0,"edits":[{"op":"wand-remove","x":0.5,"y":0.1,"tolerance":12}]}';

    $sticker = $this->service->upload($this->pack, UploadedFile::fake()->createWithContent('dot.png', $pngBytes), 'Chấm đỏ', [], $edit)->fresh();

    $expectedHash = hash('sha256', $pngBytes."\n".json_encode(json_decode($edit, true)));
    expect($sticker->only(['sticker_pack_id', 'label', 'content_hash', 'status', 'original_path', 'width', 'height', 'frame_count', 'duration_ms', 'byte_size', 'position', 'image_path', 'static_path']))->toBe([
        'sticker_pack_id' => $this->pack->id,
        'label' => 'Chấm đỏ',
        'content_hash' => $expectedHash,
        'status' => Sticker::STATUS_PROCESSING,
        'original_path' => StickerFileLayout::originalPath($expectedHash, 'png'),
        'width' => Sticker::imageSize(),
        'height' => Sticker::imageSize(),
        'frame_count' => null,
        'duration_ms' => null,
        'byte_size' => null,
        'position' => 0,
        'image_path' => null,
        'static_path' => null,
    ])
        ->and($sticker->edit_params)->toEqual(json_decode($edit, true))
        ->and($this->disk->get($sticker->original_path))->toBe($pngBytes);
    Queue::assertPushedOn('stickers', RenderStickerJob::class, fn (RenderStickerJob $job) => $job->sticker->is($sticker) && ! $job->refreshing);
});

it('không gửi thông số chỉnh thì để trống edit_params cho trình dựng dùng mặc định', function (?string $edit) {
    $sticker = $this->service->upload($this->pack, YonaStickers::imageUpload(), editJson: $edit)->fresh();

    expect($sticker->edit_params)->toBeNull()
        ->and($sticker->status)->toBe(Sticker::STATUS_PROCESSING);
})->with(['null' => [null], 'chuỗi rỗng' => [''], 'object rỗng' => ['{}']]);

it('lưu ảnh gốc theo loại ảnh đọc từ nội dung, không theo đuôi tệp', function () {
    $sticker = $this->service->upload($this->pack, UploadedFile::fake()->createWithContent('actually-png.gif', YonaStickers::png(64)));

    expect($sticker->original_path)->toEndWith('/original.png');
});

it('nhận GIF động và đuôi viết hoa', function () {
    $sticker = $this->service->upload($this->pack, YonaStickers::animatedUpload('WAVE.GIF'));

    expect($sticker->original_path)->toEndWith('/original.gif')
        ->and($sticker->status)->toBe(Sticker::STATUS_PROCESSING);
});

it('cùng ảnh cùng thông số chỉnh tải lại vào cùng bộ thì trả sticker cũ, không dựng lại', function () {
    $edit = '{"tolerance":12,"removeBackground":true}';
    $first = $this->service->upload($this->pack, YonaStickers::imageUpload('a.png'), 'Lần đầu', [], $edit);

    $again = $this->service->upload($this->pack, YonaStickers::imageUpload('b.png'), 'Lần hai', [], '{ "removeBackground": true, "tolerance": 12.0 }');

    expect($again->is($first))->toBeTrue()
        ->and($again->label)->toBe('Lần đầu')
        ->and(Sticker::query()->count())->toBe(1);
    Queue::assertPushed(RenderStickerJob::class, 1);
});

it('cùng ảnh khác thông số chỉnh là sticker khác', function () {
    $keepBackground = $this->service->upload($this->pack, YonaStickers::imageUpload(), editJson: '{"removeBackground":false}');
    $removeBackground = $this->service->upload($this->pack, YonaStickers::imageUpload(), editJson: '{"removeBackground":true}');

    expect($removeBackground->is($keepBackground))->toBeFalse()
        ->and($removeBackground->content_hash)->not->toBe($keepBackground->content_hash)
        ->and(dirname($removeBackground->original_path))->not->toBe(dirname($keepBackground->original_path));
    Queue::assertPushed(RenderStickerJob::class, 2);
});

it('sticker trùng đã ready thì không dựng lại', function () {
    $first = $this->service->upload($this->pack, YonaStickers::imageUpload());
    $first->update(['status' => Sticker::STATUS_READY, ...StickerFileLayout::renderedPaths($first->content_hash)]);

    $again = $this->service->upload($this->pack, YonaStickers::imageUpload());

    expect($again->fresh()->status)->toBe(Sticker::STATUS_READY);
    Queue::assertPushed(RenderStickerJob::class, 1);
});

it('sticker trùng từng hỏng thì lưu lại ảnh gốc và dựng lại', function () {
    $first = $this->service->upload($this->pack, YonaStickers::imageUpload());
    $this->disk->deleteDirectory(StickerFileLayout::directory($first->content_hash));
    $first->update(['status' => Sticker::STATUS_FAILED, 'failure_code' => StickerRenderer::RENDER_TIMEOUT, 'original_path' => null]);

    $again = $this->service->upload($this->pack, YonaStickers::imageUpload());

    expect($again->is($first))->toBeTrue()
        ->and($again->fresh()->only(['status', 'failure_code', 'original_path']))
        ->toBe(['status' => Sticker::STATUS_PROCESSING, 'failure_code' => null, 'original_path' => $first->fresh()->original_path])
        ->and($this->disk->exists((string) $again->fresh()->original_path))->toBeTrue();
    Queue::assertPushed(RenderStickerJob::class, 2);
});

it('xếp dựng lại sticker kẹt processing quá lâu sau mọi lượt dựng', function () {
    $first = $this->service->upload($this->pack, YonaStickers::imageUpload());
    $this->travel(StickerUploadService::STALE_PROCESSING_SECONDS + 1)->seconds();

    $again = $this->service->upload($this->pack, YonaStickers::imageUpload());
    $thirdRightAfter = $this->service->upload($this->pack, YonaStickers::imageUpload());

    expect($again->is($first))->toBeTrue()
        ->and($thirdRightAfter->is($first))->toBeTrue()
        ->and($again->fresh()->status)->toBe(Sticker::STATUS_PROCESSING);
    Queue::assertPushed(RenderStickerJob::class, 2);
});

it('cùng ảnh ở hai bộ là hai sticker dùng chung tệp theo hash', function () {
    $otherPack = StickerPack::factory()->create();

    $first = $this->service->upload($this->pack, YonaStickers::imageUpload());
    $second = $this->service->upload($otherPack, YonaStickers::imageUpload());

    expect($second->is($first))->toBeFalse()
        ->and($second->content_hash)->toBe($first->content_hash)
        ->and($second->original_path)->toBe($first->original_path);
    Queue::assertPushed(RenderStickerJob::class, 2);
});

it('sticker mới xếp sau sticker cuối của bộ', function () {
    $this->service->upload($this->pack, YonaStickers::imageUpload(seed: 1));
    $second = $this->service->upload($this->pack, YonaStickers::imageUpload(seed: 2));

    expect($second->position)->toBe(1);
});

it('cắt khoảng trắng của nhãn, nhãn trống thành không có nhãn', function (string $label, ?string $expected) {
    $sticker = $this->service->upload($this->pack, YonaStickers::imageUpload(), $label);

    expect($sticker->label)->toBe($expected);
})->with([
    'có khoảng trắng' => ['  Vẫy tay  ', 'Vẫy tay'],
    'trống' => ['   ', null],
]);

it('ghi ảnh gốc hỏng thì sticker failed, không xếp job', function () {
    $failingDisk = Mockery::mock($this->disk)->makePartial();
    $failingDisk->shouldReceive('putFileAs')->andReturn(false);
    Storage::set(Sticker::DISK, $failingDisk);

    $sticker = $this->service->upload($this->pack, YonaStickers::imageUpload());

    expect($sticker->fresh()->only(['status', 'failure_code']))
        ->toBe(['status' => Sticker::STATUS_FAILED, 'failure_code' => RenderStickerJob::STORAGE_WRITE_FAILED]);
    Queue::assertNothingPushed();
});

it('từ chối ảnh bằng câu đã dịch và không tạo gì', function (Closure $makeUpload, string $expectedCode) {
    $errors = ($this->rejection)(fn () => $this->service->upload($this->pack, $makeUpload()));

    expect($errors)->toBe(['file' => [__("errors.sticker_uploads.{$expectedCode}", StickerUploadService::limitPlaceholders())]])
        ->and(Sticker::query()->count())->toBe(0)
        ->and($this->disk->allFiles())->toBe([]);
    Queue::assertNothingPushed();
})->with([
    'đuôi Lottie' => [fn () => UploadedFile::fake()->createWithContent('ball.json', '{"v":"5.7.4"}'), StickerUploadService::UNSUPPORTED_FILE_TYPE],
    'đuôi TGS' => [fn () => UploadedFile::fake()->createWithContent('ball.tgs', gzencode('{}')), StickerUploadService::UNSUPPORTED_FILE_TYPE],
    'đuôi ảnh nhưng nội dung không phải ảnh' => [fn () => UploadedFile::fake()->createWithContent('fake.png', 'không phải ảnh'), StickerUploadService::UNSUPPORTED_FILE_TYPE],
    'ảnh loại không nhận (BMP)' => [fn () => UploadedFile::fake()->createWithContent('pic.png', "BM\x36\x00\x00\x00\x00\x00\x00\x00\x36\x00\x00\x00\x28\x00\x00\x00\x01\x00\x00\x00\x01\x00\x00\x00\x01\x00\x18\x00".str_repeat("\x00", 28)), StickerUploadService::UNSUPPORTED_FILE_TYPE],
    'vượt trần dung lượng' => [fn () => UploadedFile::fake()->create('big.png', StickerUploadService::maxUploadBytes() / 1024 + 1, 'image/png'), StickerUploadService::FILE_TOO_LARGE],
    'PHP chặn vì quá upload_max_filesize' => [fn () => new UploadedFile(base_path(YonaStickers::ANIMATED_FIXTURE), 'big.gif', 'image/gif', UPLOAD_ERR_INI_SIZE, true), StickerUploadService::FILE_TOO_LARGE],
    'tải lên dở dang' => [fn () => new UploadedFile(base_path(YonaStickers::ANIMATED_FIXTURE), 'half.gif', 'image/gif', UPLOAD_ERR_PARTIAL, true), StickerUploadService::FILE_UNREADABLE],
]);

it('từ chối thông số chỉnh sai hợp đồng ở trường edit', function (string $edit) {
    $errors = ($this->rejection)(fn () => $this->service->upload($this->pack, YonaStickers::imageUpload(), editJson: $edit));

    expect($errors)->toBe(['edit' => [__('errors.sticker_uploads.invalid_edit')]])
        ->and(Sticker::query()->count())->toBe(0);
    Queue::assertNothingPushed();
})->with([
    'JSON hỏng' => ['{"crop":'],
    'không phải object' => ['[1,2]'],
    'dung sai vượt 100' => ['{"tolerance":101}'],
]);

it('điền trần dung lượng vào câu báo lỗi', function () {
    config(['yona.stickers.max_original_mb' => 3]);

    $errors = ($this->rejection)(fn () => $this->service->upload($this->pack, UploadedFile::fake()->create('big.png', 3 * 1024 + 1, 'image/png')));

    expect($errors['file'][0])->toBe('Uploaded images can be at most 3 MB.');
});

it('mọi mã từ chối và mã dựng hỏng đều có câu ở mọi ngôn ngữ', function (string $locale) {
    $codes = collect([StickerUploadService::class, StickerRenderer::class, RenderStickerJob::class])
        ->flatMap(fn (string $class) => array_filter((new ReflectionClass($class))->getConstants(ReflectionClassConstant::IS_PUBLIC), 'is_string'))
        ->values();

    expect($codes)->toContain(StickerUploadService::INVALID_EDIT, StickerRenderer::IMAGE_EMPTY, RenderStickerJob::ORIGINAL_MISSING)
        ->and($codes->reject(fn (string $code) => Lang::has("errors.sticker_uploads.{$code}", $locale, false))->values()->all())->toBe([]);
})->with(['vi', 'en']);
