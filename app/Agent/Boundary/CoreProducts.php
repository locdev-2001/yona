<?php

namespace App\Agent\Boundary;

use App\Agent\ValueObjects\Product;
use App\Messaging\Structured\Money;
use App\Models\CannedResponse;

// Sản phẩm của shop = từng thẻ trong câu trả lời mẫu loại `cards` (một câu trả lời mẫu
// có thể chứa nhiều thẻ). Nguồn duy nhất cho đọc danh mục, tra tri thức và gửi thẻ: id
// sản phẩm, cách đọc thẻ đã lưu, cách tả thẻ thành chữ cho mô hình. Luôn khoá theo account.
final class CoreProducts
{
    public const CARDS_CONTENT_TYPE = 'cards';

    private const ID_SEPARATOR = ':';

    // SME khai vài chục tới vài trăm sản phẩm; quá trần này thì đọc phần mới nhất.
    private const MAX_SOURCES = 500;

    private const TITLE_WEIGHT = 3.0;

    /** @return list<array{source: CannedResponse, item: array<string, mixed>}> */
    public static function items(int $accountId): array
    {
        $sources = CannedResponse::query()
            ->where('account_id', $accountId)
            ->where('content_type', self::CARDS_CONTENT_TYPE)
            ->orderByDesc('id')
            ->limit(self::MAX_SOURCES)
            ->get()
            ->sortBy('id');

        $items = [];

        foreach ($sources as $source) {
            foreach (self::itemsOf($source) as $item) {
                $items[] = ['source' => $source, 'item' => $item];
            }
        }

        return $items;
    }

    /**
     * Thẻ theo id sản phẩm, đúng thứ tự xin; id không có trong account thì vắng mặt.
     *
     * @param  list<string>  $productIds
     * @return array<string, array{source: CannedResponse, item: array<string, mixed>}>
     */
    public static function find(int $accountId, array $productIds): array
    {
        $wanted = [];

        foreach ($productIds as $productId) {
            [$sourceId, $itemId] = array_pad(explode(self::ID_SEPARATOR, $productId, 2), 2, '');

            if (ctype_digit($sourceId) && $itemId !== '') {
                $wanted[$productId] = [(int) $sourceId, $itemId];
            }
        }

        if ($wanted === []) {
            return [];
        }

        $sources = CannedResponse::query()
            ->where('account_id', $accountId)
            ->where('content_type', self::CARDS_CONTENT_TYPE)
            ->whereKey(array_unique(array_column($wanted, 0)))
            ->get()
            ->keyBy('id');
        $found = [];

        foreach ($wanted as $productId => [$sourceId, $itemId]) {
            $source = $sources->get($sourceId);
            $item = $source === null ? null : collect(self::itemsOf($source))->firstWhere('id', $itemId);

            if ($item !== null) {
                $found[$productId] = ['source' => $source, 'item' => $item];
            }
        }

        return $found;
    }

    /**
     * Xếp theo độ khớp không phân biệt dấu: từ khoá trúng tên nặng hơn trúng mô tả, biến
     * thể hay câu trả lời mẫu. Truy vấn rỗng giữ thứ tự khai.
     *
     * @param  list<array{source: CannedResponse, item: array<string, mixed>}>  $items
     * @return list<array{source: CannedResponse, item: array<string, mixed>}>
     */
    public static function rank(array $items, ?string $query): array
    {
        if (TextMatch::terms((string) $query) === []) {
            return $items;
        }

        $documents = array_map(fn (array $entry) => [
            [(string) $entry['item']['title'], self::TITLE_WEIGHT],
            [implode(' ', [
                $entry['item']['description'] ?? '',
                $entry['source']->short_code,
                $entry['source']->content ?? '',
                ...array_map(fn (array $variant) => $variant['name'].' '.implode(' ', array_column($variant['options'], 'label')), $entry['item']['variants'] ?? []),
            ]), 1.0],
        ], $items);

        return array_map(fn (int $index) => $items[$index], TextMatch::rank((string) $query, $documents));
    }

    /** @param array<string, mixed> $item */
    public static function product(CannedResponse $source, array $item): Product
    {
        $price = $item['price'] ?? null;

        return new Product(
            id: $source->id.self::ID_SEPARATOR.$item['id'],
            sourceRef: "canned_response:{$source->id}",
            title: (string) $item['title'],
            description: $item['description'] ?? null,
            price: $price['amount'] ?? null,
            compareAtPrice: $price['compare_at'] ?? null,
            currency: (string) ($price['currency'] ?? Money::DEFAULT_CURRENCY),
            stockLabel: $item['stock_label'] ?? null,
            maxQuantity: $item['max_quantity'] ?? null,
            variants: array_map(fn (array $variant) => [
                'name' => (string) $variant['name'],
                'options' => array_map(fn (array $option) => (string) $option['label'], $variant['options']),
                'unavailable' => array_values(array_map(
                    fn (array $option) => (string) $option['label'],
                    array_filter($variant['options'], fn (array $option) => $option['disabled'] ?? false),
                )),
            ], $item['variants'] ?? []),
            orderable: in_array('order', array_column($item['actions'] ?? [], 'kind'), true),
        );
    }

    // Một dòng chữ đủ để tư vấn: tên, giá (giá gạch), tồn, biến thể (hết hàng), mô tả, id.
    public static function describe(Product $product): string
    {
        $parts = [$product->title];

        if ($product->price !== null) {
            $parts[] = Money::format($product->price, $product->currency)
                .($product->compareAtPrice === null ? '' : ' (was '.Money::format($product->compareAtPrice, $product->currency).')');
        }

        foreach ($product->variants as $variant) {
            $unavailable = $variant['unavailable'] === [] ? '' : ' (out of stock: '.implode(', ', $variant['unavailable']).')';
            $parts[] = $variant['name'].': '.implode(', ', $variant['options']).$unavailable;
        }

        if ($product->stockLabel !== null) {
            $parts[] = $product->stockLabel;
        }

        if ($product->description !== null) {
            $parts[] = $product->description;
        }

        $parts[] = "product id {$product->id}";

        return implode(' · ', $parts);
    }

    /** @return list<array<string, mixed>> thẻ đã chuẩn hoá lúc shop lưu; dữ liệu hỏng thì bỏ */
    public static function itemsOf(CannedResponse $source): array
    {
        $items = $source->content_attributes['items'] ?? null;

        if (! is_array($items)) {
            return [];
        }

        return array_values(array_filter($items, fn (mixed $item) => is_array($item)
            && is_string($item['id'] ?? null) && $item['id'] !== ''
            && is_string($item['title'] ?? null) && $item['title'] !== ''));
    }
}
