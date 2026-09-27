<?php

namespace App\Services\Stickers;

use stdClass;

// Rút gọn tài liệu Lottie đã qua LottieDocumentValidator: bỏ metadata, tên lớp,
// lớp và hình bị ẩn, làm tròn số. Đầu ra tất định nên dùng làm khoá băm nội dung.
final class LottieMinifier
{
    private const DECIMAL_PLACES = 2;

    private const DROPPED_KEYS = ['meta', 'nm'];

    private const MARKERS_KEY = 'markers';

    private const LAYERS_KEY = 'layers';

    private const SHAPE_LIST_KEYS = ['shapes', 'it'];

    // Lớp ẩn vẫn phải giữ khi lớp khác dựa vào nó: làm cha (`parent`), làm
    // mặt nạ theo chỉ số (`tp`) hoặc chính nó là mặt nạ của lớp ngay sau (`td`).
    private const LAYER_REFERENCE_KEYS = ['parent', 'tp'];

    private const MATTE_SOURCE_KEY = 'td';

    public function minify(stdClass $document): string
    {
        return json_encode($this->minifyObject($document), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }

    private function minifyObject(stdClass $object): stdClass
    {
        $minified = new stdClass;

        foreach (get_object_vars($object) as $key => $value) {
            if (in_array($key, self::DROPPED_KEYS, true)) {
                continue;
            }

            // Marker giữ nguyên tên vì trình render tìm khung poster theo tên marker.
            $minified->{$key} = match (true) {
                $key === self::MARKERS_KEY => $this->roundNumbers($value),
                $key === self::LAYERS_KEY && is_array($value) => $this->minifyValue($this->withoutHiddenLayers($value)),
                in_array($key, self::SHAPE_LIST_KEYS, true) && is_array($value) => $this->minifyValue(array_values(array_filter($value, fn (mixed $shape) => ! $this->isHidden($shape)))),
                default => $this->minifyValue($value),
            };
        }

        return $minified;
    }

    private function minifyValue(mixed $value): mixed
    {
        return match (true) {
            $value instanceof stdClass => $this->minifyObject($value),
            is_array($value) => array_map(fn (mixed $item) => $this->minifyValue($item), $value),
            default => $this->roundNumbers($value),
        };
    }

    private function roundNumbers(mixed $value): mixed
    {
        if (is_float($value)) {
            $rounded = round($value, self::DECIMAL_PLACES);

            return floor($rounded) === $rounded && abs($rounded) < PHP_INT_MAX ? (int) $rounded : $rounded;
        }

        if ($value instanceof stdClass) {
            $rounded = new stdClass;
            foreach (get_object_vars($value) as $key => $item) {
                $rounded->{$key} = $this->roundNumbers($item);
            }

            return $rounded;
        }

        return is_array($value) ? array_map(fn (mixed $item) => $this->roundNumbers($item), $value) : $value;
    }

    /**
     * @param  array<mixed>  $layers
     * @return list<mixed>
     */
    private function withoutHiddenLayers(array $layers): array
    {
        $referencedIndexes = [];
        foreach ($layers as $layer) {
            foreach (self::LAYER_REFERENCE_KEYS as $referenceKey) {
                if ($layer instanceof stdClass && isset($layer->{$referenceKey})) {
                    $referencedIndexes[] = $layer->{$referenceKey};
                }
            }
        }

        return array_values(array_filter($layers, fn (mixed $layer) => ! $this->isHidden($layer)
            || ! empty($layer->{self::MATTE_SOURCE_KEY} ?? null)
            || (isset($layer->ind) && in_array($layer->ind, $referencedIndexes))));
    }

    private function isHidden(mixed $node): bool
    {
        return $node instanceof stdClass && ($node->hd ?? false) === true;
    }
}
