<?php

namespace App\Services\Stickers;

use InvalidArgumentException;
use JsonException;

/**
 * Thông số cắt + xoá nền của một sticker, cùng một JSON cho trường `edit` của API
 * tải lên, cột `stickers.edit_params` và tệp --edit của trình dựng. Toạ độ chuẩn
 * hoá: `crop` theo ảnh gốc (được vượt biên, phần vượt trong suốt), `edits` và
 * `radius` theo vùng lấy. `fit` cover cắt sát phần còn thấy được, contain đặt
 * nguyên vùng lấy vào ô vuông theo cạnh dài.
 *
 * Chỉ giữ khoá đã gửi (trừ `fit` mặc định, để hash sticker cũ không đổi), theo
 * thứ tự cố định, số nguyên viết như số nguyên: cùng một chỉnh sửa luôn ra cùng
 * một chuỗi, nên content_hash (ảnh gốc + chuỗi này) nhận ra sticker trùng. Khoá
 * vắng mặt dùng mặc định của trình dựng.
 */
final class StickerEdit
{
    public const MAX_EDITS = 200;

    public const MAX_BRUSH_POINTS = 2000;

    // Các giới hạn dưới đây là của trình dựng: vượt là CLI từ chối tệp --edit.
    public const MAX_JSON_BYTES = 1024 * 1024;

    public const MAX_TOLERANCE = 100;

    public const MAX_FEATHER = 4;

    public const MAX_STROKE_WIDTH = 0.08;

    public const MIN_CROP_SIDE = 0.0001;

    public const MAX_CROP_OVERFLOW = 8;

    public const FIT_COVER = 'cover';

    public const FIT_CONTAIN = 'contain';

    public const FITS = [self::FIT_COVER, self::FIT_CONTAIN];

    public const WAND_OPERATIONS = ['wand-remove', 'wand-keep'];

    public const BRUSH_OPERATIONS = ['brush-remove', 'brush-keep'];

    private const CROP_BOUND_EPSILON = 0.000001;

    private const JSON_DEPTH = 16;

    /** @param  array<string, mixed>  $params */
    private function __construct(public readonly array $params) {}

    /**
     * Chuỗi rỗng hoặc null = không chỉnh (xoá nền mặc định, không cắt).
     *
     * @throws InvalidArgumentException khi JSON hỏng hoặc sai hợp đồng
     */
    public static function fromJson(?string $json): self
    {
        if ($json === null || trim($json) === '') {
            return new self([]);
        }

        if (strlen($json) > self::MAX_JSON_BYTES) {
            throw self::invalid('edit exceeds the size limit');
        }

        try {
            $decoded = json_decode($json, true, self::JSON_DEPTH, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw self::invalid($exception->getMessage());
        }

        $edit = new self(self::normalized($decoded));

        if (strlen($edit->json()) > self::MAX_JSON_BYTES) {
            throw self::invalid('edit exceeds the size limit');
        }

        return $edit;
    }

    public function isEmpty(): bool
    {
        return $this->params === [];
    }

    public function json(): string
    {
        return json_encode($this->params, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
    }

    /** @return array<string, mixed> */
    private static function normalized(mixed $root): array
    {
        if (! is_array($root) || ($root !== [] && array_is_list($root))) {
            throw self::invalid('edit must be an object');
        }

        $params = [];

        if (($root['crop'] ?? null) !== null) {
            $params['crop'] = self::crop($root['crop']);
        }

        if (array_key_exists('fit', $root) && self::fit($root['fit']) !== self::FIT_COVER) {
            $params['fit'] = $root['fit'];
        }

        if (array_key_exists('removeBackground', $root)) {
            $params['removeBackground'] = is_bool($root['removeBackground'])
                ? $root['removeBackground']
                : throw self::invalid('removeBackground must be a boolean');
        }

        if (array_key_exists('tolerance', $root)) {
            $params['tolerance'] = self::number($root['tolerance'], 0, self::MAX_TOLERANCE, 'tolerance');
        }

        if (array_key_exists('feather', $root)) {
            $params['feather'] = self::number($root['feather'], 0, self::MAX_FEATHER, 'feather');
        }

        if (array_key_exists('strokeWidth', $root)) {
            $strokeWidth = self::number($root['strokeWidth'], 0, self::MAX_STROKE_WIDTH, 'strokeWidth');
            if ($strokeWidth > 0) {
                $params['strokeWidth'] = $strokeWidth;
            }
        }

        if (array_key_exists('edits', $root)) {
            $params['edits'] = self::edits($root['edits']);
        }

        return $params;
    }

    /** @return array{x: int|float, y: int|float, w: int|float, h: int|float} */
    private static function crop(mixed $crop): array
    {
        if (! is_array($crop) || array_is_list($crop)) {
            throw self::invalid('crop must be an object or null');
        }

        $maxSide = 1 + 2 * self::MAX_CROP_OVERFLOW;
        $rectangle = [
            'x' => self::number($crop['x'] ?? null, -self::MAX_CROP_OVERFLOW, 1, 'crop.x'),
            'y' => self::number($crop['y'] ?? null, -self::MAX_CROP_OVERFLOW, 1, 'crop.y'),
            'w' => self::number($crop['w'] ?? null, self::MIN_CROP_SIDE, $maxSide, 'crop.w'),
            'h' => self::number($crop['h'] ?? null, self::MIN_CROP_SIDE, $maxSide, 'crop.h'),
        ];
        $right = $rectangle['x'] + $rectangle['w'];
        $bottom = $rectangle['y'] + $rectangle['h'];

        if (1 + self::MAX_CROP_OVERFLOW + self::CROP_BOUND_EPSILON < max($right, $bottom)) {
            throw self::invalid('crop overflows the image by more than '.self::MAX_CROP_OVERFLOW);
        }

        if ($rectangle['x'] >= 1 || $rectangle['y'] >= 1 || $right <= 0 || $bottom <= 0) {
            throw self::invalid('crop does not overlap the image');
        }

        return $rectangle;
    }

    private static function fit(mixed $fit): string
    {
        return in_array($fit, self::FITS, true)
            ? $fit
            : throw self::invalid('fit must be one of '.implode(', ', self::FITS));
    }

    /** @return list<array<string, mixed>> */
    private static function edits(mixed $edits): array
    {
        if (! is_array($edits) || ! array_is_list($edits) || count($edits) > self::MAX_EDITS) {
            throw self::invalid('edits must be a list of at most '.self::MAX_EDITS);
        }

        return array_map(self::operation(...), $edits, array_keys($edits));
    }

    /** @return array<string, mixed> */
    private static function operation(mixed $edit, int $index): array
    {
        $field = "edits.{$index}";
        $operation = is_array($edit) ? ($edit['op'] ?? null) : null;

        if (in_array($operation, self::WAND_OPERATIONS, true)) {
            return [
                'op' => $operation,
                'x' => self::number($edit['x'] ?? null, 0, 1, "{$field}.x"),
                'y' => self::number($edit['y'] ?? null, 0, 1, "{$field}.y"),
                ...(array_key_exists('tolerance', $edit)
                    ? ['tolerance' => self::number($edit['tolerance'], 0, self::MAX_TOLERANCE, "{$field}.tolerance")]
                    : []),
            ];
        }

        if (in_array($operation, self::BRUSH_OPERATIONS, true)) {
            return [
                'op' => $operation,
                'points' => self::points($edit['points'] ?? null, "{$field}.points"),
                'radius' => self::number($edit['radius'] ?? null, 0, 1, "{$field}.radius"),
            ];
        }

        throw self::invalid("{$field}.op is not a known operation");
    }

    /** @return list<array{0: int|float, 1: int|float}> */
    private static function points(mixed $points, string $field): array
    {
        if (! is_array($points) || ! array_is_list($points) || $points === [] || count($points) > self::MAX_BRUSH_POINTS) {
            throw self::invalid("{$field} must hold 1..".self::MAX_BRUSH_POINTS.' points');
        }

        return array_map(function (mixed $point) use ($field) {
            if (! is_array($point) || ! array_is_list($point) || count($point) !== 2) {
                throw self::invalid("{$field} must be [x, y] pairs");
            }

            return [self::number($point[0], 0, 1, $field), self::number($point[1], 0, 1, $field)];
        }, $points);
    }

    private static function number(mixed $value, float $min, float $max, string $field): int|float
    {
        if ((! is_int($value) && ! is_float($value)) || ! is_finite((float) $value) || $value < $min || $value > $max) {
            throw self::invalid("{$field} must be a number in [{$min}, {$max}]");
        }

        return is_float($value) && floor($value) === $value ? (int) $value : $value;
    }

    private static function invalid(string $detail): InvalidArgumentException
    {
        return new InvalidArgumentException("Invalid sticker edit: {$detail}");
    }
}
