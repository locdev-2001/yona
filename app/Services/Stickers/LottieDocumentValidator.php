<?php

namespace App\Services\Stickers;

use Closure;
use JsonException;
use stdClass;
use UnexpectedValueException;

// Cổng an toàn cho mọi tệp sticker trước khi vào kho: thuần PHP, không I/O,
// không gọi trình render. Kết quả là tài liệu Lottie đã giải mã hoặc một mã từ
// chối ổn định (cũng là khoá bản dịch errors.sticker_uploads.*).
final class LottieDocumentValidator
{
    public const MAX_UPLOAD_BYTES = 100 * 1024;

    public const MAX_DECOMPRESSED_BYTES = 1024 * 1024;

    public const MAX_CANVAS_SIZE = 512;

    public const MAX_DURATION_SECONDS = 3;

    public const MAX_FRAME_RATE = 60;

    // Đếm sau khi trải precomp: một precomp dùng ở mười chỗ tính mười lần.
    public const MAX_LAYERS = 500;

    public const MAX_SHAPES = 5000;

    public const MAX_PRECOMP_DEPTH = 5;

    public const MAX_REPEATER_COPIES = 100;

    // Mỗi đỉnh polystar tính như một hình trong ngân sách MAX_SHAPES.
    public const MAX_POLYSTAR_POINTS = 100;

    public const FILE_TOO_LARGE = 'file_too_large';

    public const INVALID_GZIP = 'invalid_gzip';

    public const DECOMPRESSED_TOO_LARGE = 'decompressed_too_large';

    public const INVALID_JSON = 'invalid_json';

    public const NESTING_TOO_DEEP = 'nesting_too_deep';

    public const INVALID_LOTTIE = 'invalid_lottie';

    public const CANVAS_TOO_LARGE = 'canvas_too_large';

    public const FRAME_RATE_TOO_HIGH = 'frame_rate_too_high';

    public const DURATION_TOO_LONG = 'duration_too_long';

    public const TEXT_NOT_ALLOWED = 'text_not_allowed';

    public const EXPRESSION_NOT_ALLOWED = 'expression_not_allowed';

    public const EMBEDDED_IMAGE_NOT_ALLOWED = 'embedded_image_not_allowed';

    public const EXTERNAL_IMAGE_NOT_ALLOWED = 'external_image_not_allowed';

    public const PRECOMP_CYCLE = 'precomp_cycle';

    public const PRECOMP_TOO_DEEP = 'precomp_too_deep';

    public const TOO_MANY_LAYERS = 'too_many_layers';

    public const TOO_MANY_SHAPES = 'too_many_shapes';

    public const REPEATER_TOO_LARGE = 'repeater_too_large';

    public const POLYSTAR_TOO_COMPLEX = 'polystar_too_complex';

    private const MAX_JSON_DEPTH = 128;

    // Một khối 1KB nén tối đa nở ra ~1MB, nên bộ nhớ chỉ tăng từng bước nhỏ
    // và dừng ngay khi vượt trần giải nén.
    private const INFLATE_CHUNK_BYTES = 1024;

    private const GZIP_MAGIC = "\x1f\x8b";

    private const EMBEDDED_IMAGE_PREFIX = 'data:';

    private const TIMELINE_AND_CANVAS_KEYS = ['ip', 'op', 'fr', 'w', 'h'];

    private const PRECOMP_LAYER_TYPE = 0;

    private const TEXT_LAYER_TYPE = 5;

    private const GROUP_SHAPE_TYPE = 'gr';

    private const REPEATER_SHAPE_TYPE = 'rp';

    private const POLYSTAR_SHAPE_TYPE = 'sr';

    /**
     * Tệp người dùng upload: Lottie (.json) hoặc TGS (gzip).
     *
     * @return array{document: stdClass}|array{rejection: string}
     */
    public function inspect(string $uploadedBytes): array
    {
        return $this->inspection(fn () => $this->validatedDocument($this->uploadedJson($uploadedBytes)));
    }

    /**
     * Chính JSON sẽ lưu vào kho (bản đã rút gọn), để thứ trình phát đọc đúng là
     * thứ đã qua kiểm tra. Không áp trần upload vì JSON của tệp .tgs lớn hơn tệp nén.
     *
     * @return array{document: stdClass}|array{rejection: string}
     */
    public function inspectStored(string $json): array
    {
        return $this->inspection(function () use ($json) {
            if (strlen($json) > self::MAX_DECOMPRESSED_BYTES) {
                $this->reject(self::DECOMPRESSED_TOO_LARGE);
            }

            return $this->validatedDocument($json);
        });
    }

    /**
     * Giá trị thay vào câu báo lỗi, lấy thẳng từ các hằng giới hạn.
     *
     * @return array<string, int>
     */
    public static function limitPlaceholders(): array
    {
        return [
            'max_upload_kb' => intdiv(self::MAX_UPLOAD_BYTES, 1024),
            'max_decompressed_kb' => intdiv(self::MAX_DECOMPRESSED_BYTES, 1024),
            'max_canvas' => self::MAX_CANVAS_SIZE,
            'max_frame_rate' => self::MAX_FRAME_RATE,
            'max_seconds' => self::MAX_DURATION_SECONDS,
            'max_layers' => self::MAX_LAYERS,
            'max_shapes' => self::MAX_SHAPES,
            'max_precomp_depth' => self::MAX_PRECOMP_DEPTH,
            'max_repeater_copies' => self::MAX_REPEATER_COPIES,
            'max_polystar_points' => self::MAX_POLYSTAR_POINTS,
        ];
    }

    /**
     * @param  Closure(): stdClass  $validate
     * @return array{document: stdClass}|array{rejection: string}
     */
    private function inspection(Closure $validate): array
    {
        try {
            return ['document' => $validate()];
        } catch (UnexpectedValueException $rejection) {
            return ['rejection' => $rejection->getMessage()];
        }
    }

    private function uploadedJson(string $uploadedBytes): string
    {
        if (strlen($uploadedBytes) > self::MAX_UPLOAD_BYTES) {
            $this->reject(self::FILE_TOO_LARGE);
        }

        return str_starts_with($uploadedBytes, self::GZIP_MAGIC) ? $this->inflate($uploadedBytes) : $uploadedBytes;
    }

    private function validatedDocument(string $json): stdClass
    {
        $document = $this->decodeJson($json);

        $this->assertTimelineAndCanvas($document);
        $this->assertNoFontTables($document);
        $this->assertSafeValues($document);

        $measured = [];
        $this->measureLayers($document->layers, $this->precompositions($document), $measured, []);

        return $document;
    }

    private function inflate(string $compressed): string
    {
        $inflater = inflate_init(ZLIB_ENCODING_GZIP);
        $json = '';

        foreach (str_split($compressed, self::INFLATE_CHUNK_BYTES) as $chunk) {
            $inflated = @inflate_add($inflater, $chunk, ZLIB_SYNC_FLUSH);
            if ($inflated === false) {
                $this->reject(self::INVALID_GZIP);
            }

            $json .= $inflated;
            if (strlen($json) > self::MAX_DECOMPRESSED_BYTES) {
                $this->reject(self::DECOMPRESSED_TOO_LARGE);
            }
            if (inflate_get_status($inflater) === ZLIB_STREAM_END) {
                return $json;
            }
        }

        $this->reject(self::INVALID_GZIP);
    }

    private function decodeJson(string $json): stdClass
    {
        try {
            $document = json_decode($json, false, self::MAX_JSON_DEPTH, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            $this->reject($exception->getCode() === JSON_ERROR_DEPTH ? self::NESTING_TOO_DEEP : self::INVALID_JSON);
        }

        if (! $document instanceof stdClass) {
            $this->reject(self::INVALID_LOTTIE);
        }

        return $document;
    }

    private function assertTimelineAndCanvas(stdClass $document): void
    {
        foreach (self::TIMELINE_AND_CANVAS_KEYS as $key) {
            if (! is_int($document->{$key} ?? null) && ! is_float($document->{$key} ?? null)) {
                $this->reject(self::INVALID_LOTTIE);
            }
        }

        if (! is_string($document->v ?? null) || ! is_array($document->layers ?? null)
            || $document->fr <= 0 || $document->op <= $document->ip || $document->w <= 0 || $document->h <= 0) {
            $this->reject(self::INVALID_LOTTIE);
        }

        if ($document->w > self::MAX_CANVAS_SIZE || $document->h > self::MAX_CANVAS_SIZE) {
            $this->reject(self::CANVAS_TOO_LARGE);
        }
        if ($document->fr > self::MAX_FRAME_RATE) {
            $this->reject(self::FRAME_RATE_TOO_HIGH);
        }
        if (($document->op - $document->ip) / $document->fr > self::MAX_DURATION_SECONDS) {
            $this->reject(self::DURATION_TOO_LONG);
        }
    }

    // Trình phát sw-lite không có font: bảng font/glyph là dấu hiệu sticker cần chữ.
    private function assertNoFontTables(stdClass $document): void
    {
        $fonts = $document->fonts ?? null;
        $fontList = $fonts instanceof stdClass ? ($fonts->list ?? []) : $fonts;

        if (! empty($fontList) || ! empty($document->chars ?? null)) {
            $this->reject(self::TEXT_NOT_ALLOWED);
        }
    }

    // Một lượt duyệt cả cây. Expression là chuỗi mã JS ở khoá `x` của một thuộc
    // tính (khoá `x` của tay nắm easing là số hoặc mảng nên không bị bắt nhầm).
    // Số tràn như 1e400 giải mã thành INF, không ghi lại được thành JSON.
    private function assertSafeValues(mixed $node): void
    {
        if (is_float($node) && ! is_finite($node)) {
            $this->reject(self::INVALID_LOTTIE);
        }

        if ($node instanceof stdClass && is_string($node->x ?? null)) {
            $this->reject(self::EXPRESSION_NOT_ALLOWED);
        }

        if ($node instanceof stdClass || is_array($node)) {
            foreach ((array) $node as $child) {
                $this->assertSafeValues($child);
            }
        }
    }

    /**
     * Precomp theo mã asset. Trình phát lấy asset khớp mã ĐẦU TIÊN nên mã trùng
     * làm phép đo ở đây lệch với thứ được vẽ: từ chối luôn.
     *
     * @return array<string, array<mixed>>
     */
    private function precompositions(stdClass $document): array
    {
        $assets = $document->assets ?? [];
        if (! is_array($assets)) {
            $this->reject(self::INVALID_LOTTIE);
        }

        $precompositions = [];
        $assetIds = [];
        foreach ($assets as $asset) {
            if (! $asset instanceof stdClass) {
                $this->reject(self::INVALID_LOTTIE);
            }
            $this->assertNoImage($asset);

            $assetId = $asset->id ?? '';
            if ((! is_string($assetId) && ! is_int($assetId)) || isset($assetIds[$assetId])) {
                $this->reject(self::INVALID_LOTTIE);
            }
            $assetIds[$assetId] = true;

            if (is_array($asset->layers ?? null)) {
                $precompositions[(string) $assetId] = $asset->layers;
            }
        }

        return $precompositions;
    }

    // Có `p` là trình phát dựng asset thành ảnh, kể cả khi asset cũng khai `layers`.
    private function assertNoImage(stdClass $asset): void
    {
        $imageFile = $asset->p ?? null;
        $imageFolder = $asset->u ?? null;

        if ($imageFile === null && (! is_string($imageFolder) || $imageFolder === '')) {
            return;
        }

        $embedded = ($asset->e ?? null) === 1
            || (is_string($imageFile) && str_starts_with($imageFile, self::EMBEDDED_IMAGE_PREFIX));

        $this->reject($embedded ? self::EMBEDDED_IMAGE_NOT_ALLOWED : self::EXTERNAL_IMAGE_NOT_ALLOWED);
    }

    /**
     * Đếm lớp, hình và độ sâu precomp sau khi trải mọi precomp. Precomp đã đo
     * được ghi nhớ nên tệp nhỏ trỏ chéo nhiều tầng vẫn đo trong thời gian tuyến tính.
     *
     * @param  array<mixed>  $layers
     * @param  array<string, array<mixed>>  $precompositions
     * @param  array<string, array{layers: int, shapes: int, depth: int}>  $measured
     * @param  array<string, true>  $openPrecompositions
     * @return array{layers: int, shapes: int, depth: int}
     */
    private function measureLayers(array $layers, array $precompositions, array &$measured, array $openPrecompositions): array
    {
        $total = ['layers' => 0, 'shapes' => 0, 'depth' => 0];

        foreach ($layers as $layer) {
            if (! $layer instanceof stdClass) {
                $this->reject(self::INVALID_LOTTIE);
            }
            $layerType = $this->layerType($layer);
            if ($layerType === self::TEXT_LAYER_TYPE) {
                $this->reject(self::TEXT_NOT_ALLOWED);
            }

            $total['layers']++;
            $total['shapes'] += count(is_array($layer->masksProperties ?? null) ? $layer->masksProperties : [])
                + $this->countShapes($layer->shapes ?? [], 1);

            $referenceId = $layer->refId ?? null;
            if ($layerType === self::PRECOMP_LAYER_TYPE && is_string($referenceId) && isset($precompositions[$referenceId])) {
                if (isset($openPrecompositions[$referenceId])) {
                    $this->reject(self::PRECOMP_CYCLE);
                }

                $nested = $measured[$referenceId] ??= $this->measureLayers(
                    $precompositions[$referenceId],
                    $precompositions,
                    $measured,
                    $openPrecompositions + [$referenceId => true],
                );
                $total['layers'] += $nested['layers'];
                $total['shapes'] += $nested['shapes'];
                $total['depth'] = max($total['depth'], $nested['depth'] + 1);
            }

            if ($total['depth'] > self::MAX_PRECOMP_DEPTH) {
                $this->reject(self::PRECOMP_TOO_DEEP);
            }
            if ($total['layers'] > self::MAX_LAYERS) {
                $this->reject(self::TOO_MANY_LAYERS);
            }
            if ($total['shapes'] > self::MAX_SHAPES) {
                $this->reject(self::TOO_MANY_SHAPES);
            }
        }

        return $total;
    }

    // Kiểu lớp so theo giá trị như trình phát đọc: `0.0` là precomp, `5.0` là lớp
    // chữ. Kiểu không phải số nguyên thì không biết trình phát hiểu thế nào.
    private function layerType(stdClass $layer): ?int
    {
        $type = $layer->ty ?? null;

        return match (true) {
            $type === null => null,
            is_int($type) => $type,
            is_float($type) && floor($type) === $type => (int) $type,
            default => $this->reject(self::INVALID_LOTTIE),
        };
    }

    // Repeater nhân mọi hình cùng nhóm và nhóm con, nên số bản sao đi dọc theo
    // chuỗi nhóm lồng nhau.
    private function countShapes(mixed $shapes, int $copies): int
    {
        if (! is_array($shapes)) {
            return 0;
        }

        $copies = min($copies * $this->repeaterCopies($shapes), self::MAX_REPEATER_COPIES + 1);
        if ($copies > self::MAX_REPEATER_COPIES) {
            $this->reject(self::REPEATER_TOO_LARGE);
        }

        $count = 0;
        foreach ($shapes as $shape) {
            if (! $shape instanceof stdClass) {
                continue;
            }

            $count += $copies * $this->shapeWeight($shape);
            if (($shape->ty ?? null) === self::GROUP_SHAPE_TYPE) {
                $count += $this->countShapes($shape->it ?? [], $copies);
            }
            if ($count > self::MAX_SHAPES) {
                $this->reject(self::TOO_MANY_SHAPES);
            }
        }

        return $count;
    }

    // Polystar sinh đỉnh theo tham số `pt` nên công vẽ theo số đỉnh: mỗi đỉnh
    // tính như một hình.
    private function shapeWeight(stdClass $shape): int
    {
        if (($shape->ty ?? null) !== self::POLYSTAR_SHAPE_TYPE) {
            return 1;
        }

        $points = ceil($this->peakValue($shape->pt ?? null) ?? 1);
        if ($points > self::MAX_POLYSTAR_POINTS) {
            $this->reject(self::POLYSTAR_TOO_COMPLEX);
        }

        return (int) max(1, $points);
    }

    /**
     * @param  array<mixed>  $shapes
     */
    private function repeaterCopies(array $shapes): int
    {
        $copies = 1;
        foreach ($shapes as $shape) {
            if ($shape instanceof stdClass && ($shape->ty ?? null) === self::REPEATER_SHAPE_TYPE) {
                $peak = ceil($this->peakValue($shape->c ?? null) ?? 1);
                $copies = (int) min($copies * max(1, min($peak, self::MAX_REPEATER_COPIES + 1)), self::MAX_REPEATER_COPIES + 1);
            }
        }

        return $copies;
    }

    /**
     * Giá trị lớn nhất một thuộc tính số đạt tới trong cả hoạt ảnh: giá trị tĩnh,
     * mọi giá trị đầu (`s`) và cuối (`e`, định dạng keyframe cũ) của keyframe,
     * cộng phần vọt quá khi tay nắm easing nằm ngoài [0, 1] — đường cong easing
     * nằm trong bao lồi các điểm điều khiển nên tiến độ không vượt quá tay nắm.
     * Null khi thuộc tính không có số nào.
     */
    private function peakValue(mixed $property): ?float
    {
        $value = $property instanceof stdClass ? ($property->k ?? null) : null;
        $keyframes = is_array($value) ? array_values(array_filter($value, fn (mixed $item) => $item instanceof stdClass)) : [];

        $values = $this->numbersIn($keyframes === []
            ? $value
            : array_map(fn (stdClass $keyframe) => [$keyframe->s ?? null, $keyframe->e ?? null], $keyframes));
        if ($values === []) {
            return null;
        }

        $handles = $this->numbersIn(array_map(fn (stdClass $keyframe) => [
            ($keyframe->o ?? null) instanceof stdClass ? ($keyframe->o->y ?? null) : null,
            ($keyframe->i ?? null) instanceof stdClass ? ($keyframe->i->y ?? null) : null,
        ], $keyframes));
        $overshoot = max([0, ...array_map(fn (int|float $handle) => max($handle - 1, -$handle), $handles)]);

        return (float) (max($values) + (max($values) - min($values)) * $overshoot);
    }

    /**
     * @return list<int|float>
     */
    private function numbersIn(mixed $value): array
    {
        if (is_int($value) || is_float($value)) {
            return [$value];
        }

        return is_array($value) ? array_merge(...array_map(fn (mixed $item) => $this->numbersIn($item), array_values($value))) : [];
    }

    private function reject(string $code): never
    {
        throw new UnexpectedValueException($code);
    }
}
