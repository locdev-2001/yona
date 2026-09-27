<?php

use App\Jobs\Stickers\RenderStickerJob;
use App\Models\Sticker;
use App\Models\StickerPack;
use App\Services\Stickers\LottieDocumentValidator;
use App\Services\Stickers\LottieMinifier;
use App\Services\Stickers\StickerRenderer;
use App\Services\Stickers\StickerUploadService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Lang;
use Illuminate\Support\Facades\Queue;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    Queue::fake();
    $this->service = app(StickerUploadService::class);
    $this->pack = StickerPack::factory()->create();
    $this->fixture = fn (string $name): string => file_get_contents(base_path("tests/Fixtures/stickers/{$name}"));
    $this->upload = fn (string $fixture, ?string $uploadName = null): UploadedFile => UploadedFile::fake()
        ->createWithContent($uploadName ?? $fixture, ($this->fixture)($fixture));
    $this->minified = fn (string $fixture): string => (new LottieMinifier)
        ->minify((new LottieDocumentValidator)->inspect(($this->fixture)($fixture))['document']);
    $this->rejectionMessage = function (Closure $upload): string {
        try {
            $upload();
        } catch (ValidationException $exception) {
            return $exception->errors()['file'][0];
        }

        throw new RuntimeException('Upload was not rejected.');
    };
});

it('creates a processing sticker keyed by the hash of the minified animation and queues its render', function () {
    $sticker = $this->service->upload($this->pack, ($this->upload)('ball-with-poster-marker.json'), 'Bóng nảy');

    $animationJson = ($this->minified)('ball-with-poster-marker.json');
    expect($sticker->fresh()->only(['sticker_pack_id', 'label', 'content_hash', 'status', 'width', 'height', 'frame_count', 'duration_ms', 'byte_size', 'position']))->toBe([
        'sticker_pack_id' => $this->pack->id,
        'label' => 'Bóng nảy',
        'content_hash' => hash('sha256', $animationJson),
        'status' => Sticker::STATUS_PROCESSING,
        'width' => 512,
        'height' => 512,
        'frame_count' => 60,
        'duration_ms' => 2000,
        'byte_size' => strlen($animationJson),
        'position' => 0,
    ]);
    Queue::assertPushedOn('low', RenderStickerJob::class, fn (RenderStickerJob $job) => $job->sticker->is($sticker)
        && $job->animationJson === $animationJson);
});

it('accepts the gzip TGS form of a sticker', function () {
    $sticker = $this->service->upload($this->pack, ($this->upload)('spinner-with-precomp.tgs'), null);

    expect($sticker->content_hash)->toBe(hash('sha256', ($this->minified)('spinner-with-precomp.json')))
        ->and($sticker->label)->toBeNull();
    Queue::assertPushed(RenderStickerJob::class, 1);
});

it('returns the existing sticker when the same animation is uploaded again to the same pack', function () {
    $first = $this->service->upload($this->pack, ($this->upload)('ball-with-poster-marker.json'), 'Lần đầu');

    $again = $this->service->upload($this->pack, ($this->upload)('ball-with-poster-marker.tgs'), 'Lần hai');

    expect($again->is($first))->toBeTrue()
        ->and($again->label)->toBe('Lần đầu')
        ->and(Sticker::query()->count())->toBe(1);
    Queue::assertPushed(RenderStickerJob::class, 1);
});

it('does not render a ready duplicate again', function () {
    $first = $this->service->upload($this->pack, ($this->upload)('ball-with-poster-marker.json'));
    $first->update(['status' => Sticker::STATUS_READY, ...RenderStickerJob::storagePaths($first->content_hash)]);

    $again = $this->service->upload($this->pack, ($this->upload)('ball-with-poster-marker.json'));

    expect($again->fresh()->status)->toBe(Sticker::STATUS_READY);
    Queue::assertPushed(RenderStickerJob::class, 1);
});

it('retries the render when the same animation failed before', function () {
    $first = $this->service->upload($this->pack, ($this->upload)('ball-with-poster-marker.json'));
    $first->update(['status' => Sticker::STATUS_FAILED, 'failure_code' => 'render_timeout']);

    $again = $this->service->upload($this->pack, ($this->upload)('ball-with-poster-marker.json'));

    expect($again->is($first))->toBeTrue()
        ->and($again->fresh()->only(['status', 'failure_code']))->toBe(['status' => Sticker::STATUS_PROCESSING, 'failure_code' => null]);
    Queue::assertPushed(RenderStickerJob::class, 2);
});

it('queues the render again for a sticker stuck in processing long after any render would have ended', function () {
    $first = $this->service->upload($this->pack, ($this->upload)('ball-with-poster-marker.json'));
    $this->travel(StickerUploadService::STALE_PROCESSING_SECONDS + 1)->seconds();

    $again = $this->service->upload($this->pack, ($this->upload)('ball-with-poster-marker.json'));
    $thirdRightAfter = $this->service->upload($this->pack, ($this->upload)('ball-with-poster-marker.json'));

    expect($again->is($first))->toBeTrue()
        ->and($thirdRightAfter->is($first))->toBeTrue()
        ->and($again->fresh()->status)->toBe(Sticker::STATUS_PROCESSING);
    Queue::assertPushed(RenderStickerJob::class, 2);
});

it('keeps separate stickers for the same animation in different packs', function () {
    $otherPack = StickerPack::factory()->create();

    $first = $this->service->upload($this->pack, ($this->upload)('ball-with-poster-marker.json'));
    $second = $this->service->upload($otherPack, ($this->upload)('ball-with-poster-marker.json'));

    expect($second->is($first))->toBeFalse()
        ->and($second->content_hash)->toBe($first->content_hash);
    Queue::assertPushed(RenderStickerJob::class, 2);
});

it('appends new stickers after the last one in the pack', function () {
    $this->service->upload($this->pack, ($this->upload)('ball-with-poster-marker.json'));
    $second = $this->service->upload($this->pack, ($this->upload)('pulse-without-marker.json'));

    expect($second->position)->toBe(1);
});

it('trims the label and stores a blank one as none', function (string $label, ?string $expected) {
    $sticker = $this->service->upload($this->pack, ($this->upload)('ball-with-poster-marker.json'), $label);

    expect($sticker->label)->toBe($expected);
})->with([
    'padded' => ['  Vẫy tay  ', 'Vẫy tay'],
    'blank' => ['   ', null],
]);

it('rejects a file with a translated message and creates nothing', function (Closure $makeUpload, string $expectedCode) {
    $message = ($this->rejectionMessage)(fn () => $this->service->upload($this->pack, $makeUpload(), null));

    expect($message)->toBe(__("errors.sticker_uploads.{$expectedCode}", LottieDocumentValidator::limitPlaceholders()))
        ->and(Sticker::query()->count())->toBe(0);
    Queue::assertNothingPushed();
})->with([
    'not a Lottie extension' => [fn () => UploadedFile::fake()->createWithContent('ball.png', 'png'), StickerUploadService::UNSUPPORTED_FILE_TYPE],
    'over the upload limit' => [fn () => UploadedFile::fake()->createWithContent('big.json', str_repeat(' ', LottieDocumentValidator::MAX_UPLOAD_BYTES + 1)), LottieDocumentValidator::FILE_TOO_LARGE],
    'expression' => [fn () => UploadedFile::fake()->createWithContent('expression.json', file_get_contents(base_path('tests/Fixtures/stickers/expression.json'))), LottieDocumentValidator::EXPRESSION_NOT_ALLOWED],
    'gzip bomb' => [fn () => UploadedFile::fake()->createWithContent('bomb.tgs', file_get_contents(base_path('tests/Fixtures/stickers/gzip-bomb.tgs'))), LottieDocumentValidator::DECOMPRESSED_TOO_LARGE],
]);

it('validates the minified JSON it is about to store, not only the uploaded file', function () {
    // Làm tròn hai chữ số đưa fr 0.004 về 0: tệp gốc qua, bản sẽ lưu thì không.
    $document = json_decode(($this->fixture)('ball-with-poster-marker.json'), true);
    $document = [...$document, 'fr' => 0.004, 'ip' => 0, 'op' => 0.01];
    $raw = json_encode($document);
    expect((new LottieDocumentValidator)->inspect($raw))->toHaveKey('document');

    $message = ($this->rejectionMessage)(fn () => $this->service->upload($this->pack, UploadedFile::fake()->createWithContent('tiny-rate.json', $raw)));

    expect($message)->toBe(__('errors.sticker_uploads.invalid_lottie'))
        ->and(Sticker::query()->count())->toBe(0);
    Queue::assertNothingPushed();
});

it('fills the limits into the rejection message', function () {
    $oversized = UploadedFile::fake()->createWithContent('big.json', str_repeat(' ', LottieDocumentValidator::MAX_UPLOAD_BYTES + 1));

    expect(($this->rejectionMessage)(fn () => $this->service->upload($this->pack, $oversized, null)))
        ->toBe('Sticker files can be at most 100 KB.');
});

it('accepts an upper-case extension', function () {
    $sticker = $this->service->upload($this->pack, ($this->upload)('ball-with-poster-marker.tgs', 'BALL.TGS'));

    expect($sticker->status)->toBe(Sticker::STATUS_PROCESSING);
});

it('has a message in every locale for every rejection and render failure code', function (string $locale) {
    $codes = collect([LottieDocumentValidator::class, StickerUploadService::class, StickerRenderer::class, RenderStickerJob::class])
        ->flatMap(fn (string $class) => array_filter((new ReflectionClass($class))->getConstants(ReflectionClassConstant::IS_PUBLIC), 'is_string'))
        ->values();

    expect($codes)->toContain(LottieDocumentValidator::POLYSTAR_TOO_COMPLEX, StickerRenderer::RENDER_TIMEOUT, RenderStickerJob::STORAGE_WRITE_FAILED)
        ->and($codes->reject(fn (string $code) => Lang::has("errors.sticker_uploads.{$code}", $locale, false))->values()->all())->toBe([]);
})->with(['vi', 'en']);
