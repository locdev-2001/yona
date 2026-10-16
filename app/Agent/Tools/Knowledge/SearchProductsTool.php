<?php

namespace App\Agent\Tools\Knowledge;

use App\Agent\Contracts\Extensions\Tool;
use App\Agent\Contracts\Ports\ProductCatalog;
use App\Agent\ValueObjects\Product;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolErrorCode;
use App\Agent\ValueObjects\ToolKind;
use App\Agent\ValueObjects\ToolResult;
use App\Agent\ValueObjects\ToolSpec;
use App\Agent\ValueObjects\TurnContext;
use Throwable;

// Tra sản phẩm shop đã khai qua Port ProductCatalog; luôn khoá theo account của lượt.
final class SearchProductsTool implements Tool
{
    public const NAME = 'search_products';

    private const DEFAULT_LIMIT = 5;

    private const MAX_LIMIT = 10;

    private const EMPTY_HINT = 'no product matched; try other keywords or leave query out to list the catalogue; never offer a product that is not listed';

    public function __construct(private readonly ProductCatalog $catalog) {}

    public function spec(): ToolSpec
    {
        return new ToolSpec(
            self::NAME,
            'Find the shop\'s products: name, price, old price, sizes/colours (`available` ones can be ordered now, '
            .'`out_of_stock` ones cannot), stock note, and the product id needed by send_product_card. Use it whenever the customer asks about a product, wants '
            .'suggestions, or before quoting a price. Keywords match without Vietnamese accents; leave query out to list '
            .'the catalogue. Prices are integers in the smallest currency unit (VND). Only these results, search_knowledge '
            .'results and staff messages are a source for prices and stock.',
            [
                'type' => 'object',
                'properties' => [
                    'query' => ['type' => 'string', 'minLength' => 1, 'maxLength' => 200, 'description' => 'A few keywords: product type, name, colour, use.'],
                    'limit' => ['type' => 'integer', 'minimum' => 1, 'maximum' => self::MAX_LIMIT, 'description' => 'How many products, default '.self::DEFAULT_LIMIT.'.'],
                ],
                'additionalProperties' => false,
            ],
            ToolKind::Read,
        );
    }

    public function run(ToolCall $call, TurnContext $context): ToolResult
    {
        try {
            $products = $this->catalog->search(
                $context->conversation->accountId,
                isset($call->args['query']) ? (string) $call->args['query'] : null,
                (int) ($call->args['limit'] ?? self::DEFAULT_LIMIT),
            );
        } catch (Throwable) {
            return ToolResult::failure(ToolErrorCode::SourceUnavailable, 'The product list is unavailable right now; do not guess prices or stock, use handoff_to_human.', retryable: true);
        }

        if ($products === []) {
            return ToolResult::success([], self::EMPTY_HINT);
        }

        return ToolResult::success(array_map(fn (Product $product) => array_filter([
            'id' => $product->id,
            'source' => $product->sourceRef,
            'title' => $product->title,
            'price' => $product->price,
            'compare_at_price' => $product->compareAtPrice,
            'currency' => $product->currency,
            'stock' => $product->stockLabel,
            'max_quantity' => $product->maxQuantity,
            'variants' => $product->variants === [] ? null : array_map(fn (array $variant) => array_filter([
                'name' => $variant['name'],
                'available' => array_values(array_diff($variant['options'], $variant['unavailable'])),
                'out_of_stock' => $variant['unavailable'] === [] ? null : $variant['unavailable'],
            ], fn (mixed $value) => $value !== null), $product->variants),
            'description' => $product->description,
            'orderable_in_card' => $product->orderable,
        ], fn (mixed $value) => $value !== null), $products));
    }
}
