<?php

namespace App\Agent\ValueObjects;

use InvalidArgumentException;

// Một sản phẩm shop đã khai thành thẻ; số tiền là số nguyên theo đơn vị nhỏ nhất của
// tiền tệ. `id` là tham chiếu để gửi lại đúng thẻ của shop, `sourceRef` là nguồn để trích.
final readonly class Product
{
    /**
     * @param  list<array{name: string, options: list<string>, unavailable: list<string>}>  $variants
     */
    public function __construct(
        public string $id,
        public string $sourceRef,
        public string $title,
        public ?string $description,
        public ?int $price,
        public ?int $compareAtPrice,
        public string $currency,
        public ?string $stockLabel,
        public ?int $maxQuantity,
        public array $variants,
        // Khách bấm đặt mua ngay trên thẻ được (chọn biến thể, số lượng).
        public bool $orderable,
    ) {
        if ($id === '' || $title === '') {
            throw new InvalidArgumentException('A product needs an id and a title.');
        }
    }
}
