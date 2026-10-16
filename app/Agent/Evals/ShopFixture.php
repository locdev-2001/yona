<?php

namespace App\Agent\Evals;

use InvalidArgumentException;
use JsonException;

// Shop mẫu của bộ chấm, đọc từ tệp JSON (dữ liệu giả). Một nguồn cho cả hai phía: seeder
// dựng shop từ đây, giám khảo đọc lại đúng dữ liệu này làm sự thật để chấm.
/**
 * @phpstan-type Article array{slug: string, title: string, description: string, content: string}
 * @phpstan-type Snippet array{short_code: string, content: string}
 * @phpstan-type Product array{short_code: string, content: string, card: array<string, mixed>}
 */
final readonly class ShopFixture
{
    public const DEFAULT_FILE = __DIR__.'/shop/fashion-shop.json';

    /**
     * @param  array{name: string, locale: string, timezone: string}  $account
     * @param  array{name: string, email: string, password: string}  $admin
     * @param  array{name: string, website_url: string}  $inbox
     * @param  array{name: string, persona: string, instructions: string}  $aiAgent
     * @param  array<string, string>  $paymentAccount
     * @param  list<array{title: string, description: string, color: string}>  $labels
     * @param  array{name: string, slug: string}  $portal
     * @param  list<Article>  $articles
     * @param  list<Snippet>  $cannedResponses
     * @param  list<Product>  $products
     */
    public function __construct(
        public string $marker,
        public array $account,
        public array $admin,
        public array $inbox,
        public array $aiAgent,
        public array $paymentAccount,
        public array $labels,
        public array $portal,
        public array $articles,
        public array $cannedResponses,
        public array $products,
    ) {
        if (preg_match('/^[a-z][a-z0-9_]{2,63}$/', $marker) !== 1) {
            throw new InvalidArgumentException('Shop fixture marker must be snake_case.');
        }

        $codes = [...array_column($cannedResponses, 'short_code'), ...array_column($products, 'short_code')];

        if (count($codes) !== count(array_unique($codes))) {
            throw new InvalidArgumentException('Shop fixture short codes must be unique.');
        }
    }

    public static function fromFile(string $file = self::DEFAULT_FILE): self
    {
        try {
            $raw = json_decode((string) file_get_contents($file), true, 64, JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new InvalidArgumentException(basename($file).': '.$exception->getMessage(), previous: $exception);
        }

        if (! is_array($raw)) {
            throw new InvalidArgumentException(basename($file).' must hold one shop object.');
        }

        return self::fromArray($raw);
    }

    /** @param array<string, mixed> $raw */
    public static function fromArray(array $raw): self
    {
        $helpCenter = self::section($raw, 'help_center');

        return new self(
            marker: (string) ($raw['marker'] ?? ''),
            account: self::strings(self::section($raw, 'account'), ['name', 'locale', 'timezone']),
            admin: self::strings(self::section($raw, 'admin'), ['name', 'email', 'password']),
            inbox: self::strings(self::section($raw, 'inbox'), ['name', 'website_url']),
            aiAgent: self::strings(self::section($raw, 'ai_agent'), ['name', 'persona', 'instructions']),
            paymentAccount: self::strings(self::section($raw, 'payment_account'), ['bank_bin', 'bank_code', 'account_number', 'account_name', 'memo_template']),
            labels: array_map(fn (mixed $label) => self::strings(self::asArray($label, 'labels'), ['title', 'description', 'color']), self::list($raw, 'labels')),
            portal: self::strings(self::section($helpCenter, 'portal'), ['name', 'slug']),
            articles: array_map(fn (mixed $article) => self::strings(self::asArray($article, 'help_center.articles'), ['slug', 'title', 'description', 'content']), self::list($helpCenter, 'articles')),
            cannedResponses: array_map(fn (mixed $snippet) => self::strings(self::asArray($snippet, 'canned_responses'), ['short_code', 'content']), self::list($raw, 'canned_responses')),
            products: array_map(fn (mixed $product) => self::product(self::asArray($product, 'products')), self::list($raw, 'products')),
        );
    }

    // Sự thật của shop cho giám khảo: mọi thứ AI tra được, đúng như đã dựng vào shop.
    public function groundTruth(): string
    {
        $lines = ["Shop: {$this->inbox['name']} ({$this->account['name']})", '', '## Câu trả lời mẫu (chính sách)'];

        foreach ($this->cannedResponses as $snippet) {
            $lines[] = "- [{$snippet['short_code']}] {$snippet['content']}";
        }

        $lines = [...$lines, '', '## Sản phẩm'];

        foreach ($this->products as $product) {
            $lines[] = "- [{$product['short_code']}] {$product['content']}".$this->priceNote($product['card']);
        }

        $lines = [...$lines, '', '## Bài Help Center'];

        foreach ($this->articles as $article) {
            $lines[] = "### {$article['title']}\n{$article['description']}\n{$article['content']}";
        }

        $lines = [...$lines, '', '## Tài khoản nhận chuyển khoản', "Ngân hàng {$this->paymentAccount['bank_code']}, số tài khoản {$this->paymentAccount['account_number']}, chủ tài khoản {$this->paymentAccount['account_name']}. Thẻ chuyển khoản AI gửi trong chat ghi nội dung chuyển khoản là mã hội thoại."];
        $lines = [...$lines, '', '## Nhãn hội thoại', ...array_map(fn (array $label) => "- {$label['title']}: {$label['description']}", $this->labels)];

        return implode("\n", $lines);
    }

    /** @param array<string, mixed> $card */
    private function priceNote(array $card): string
    {
        $price = $card['price'] ?? null;

        return is_array($price) && isset($price['amount']) ? ' (giá trên thẻ: '.number_format((int) $price['amount'], 0, ',', '.').'đ)' : '';
    }

    /**
     * @param  array<string, mixed>  $raw
     * @return array{short_code: string, content: string, card: array<string, mixed>}
     */
    private static function product(array $raw): array
    {
        $card = $raw['card'] ?? null;

        if (! is_array($card)) {
            throw new InvalidArgumentException('Every product needs a `card` object.');
        }

        return [...self::strings($raw, ['short_code', 'content']), 'card' => $card];
    }

    /**
     * @param  array<string, mixed>  $raw
     * @param  list<string>  $keys
     * @return array<string, string>
     */
    private static function strings(array $raw, array $keys): array
    {
        $picked = [];

        foreach ($keys as $key) {
            $value = $raw[$key] ?? null;

            if (! is_string($value) || trim($value) === '') {
                throw new InvalidArgumentException("Shop fixture needs a non-empty `{$key}`.");
            }

            $picked[$key] = trim($value);
        }

        return $picked;
    }

    /**
     * @param  array<string, mixed>  $raw
     * @return array<string, mixed>
     */
    private static function section(array $raw, string $key): array
    {
        return self::asArray($raw[$key] ?? null, $key);
    }

    /**
     * @param  array<string, mixed>  $raw
     * @return list<mixed>
     */
    private static function list(array $raw, string $key): array
    {
        $value = $raw[$key] ?? null;

        if (! is_array($value) || ! array_is_list($value) || $value === []) {
            throw new InvalidArgumentException("Shop fixture needs a non-empty `{$key}` list.");
        }

        return $value;
    }

    /** @return array<string, mixed> */
    private static function asArray(mixed $value, string $key): array
    {
        if (! is_array($value)) {
            throw new InvalidArgumentException("Shop fixture `{$key}` must be an object.");
        }

        return $value;
    }
}
