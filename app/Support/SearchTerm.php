<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Từ khoá người dùng gõ vào ô tìm kiếm — nguồn duy nhất dựng mệnh đề "chứa từ
 * khoá" cho truy vấn tìm. Ký tự đại diện của LIKE trong từ khoá được coi là chữ
 * thường. Chữ người đọc khớp theo từng từ: từ khoá qua hàm SQL `search_fold` (cùng
 * luật với resources/js/shared/helpers/searchFold.ts) rồi tách theo khoảng trắng,
 * mỗi từ phải có mặt nhưng không cần liền nhau hay đúng thứ tự.
 */
final class SearchTerm
{
    private const LIKE_ESCAPES = ['\\' => '\\\\', '%' => '\\%', '_' => '\\_'];

    private readonly string $raw;

    /** @var list<string>|null */
    private ?array $foldedWords = null;

    public function __construct(string $raw)
    {
        $this->raw = trim($raw);
    }

    /** @param array<string, mixed> $params */
    public static function fromParams(array $params): self
    {
        $query = $params['q'] ?? '';

        return new self(is_scalar($query) ? (string) $query : '');
    }

    public function raw(): string
    {
        return $this->raw;
    }

    public function containsPattern(): string
    {
        return self::containsPatternOf($this->raw);
    }

    /**
     * Khớp không dấu, không phân biệt hoa/thường, theo từng từ — cho chữ người đọc
     * (tên, nội dung, tên tệp). Từ khoá không còn từ nào thì không lọc theo cột này.
     *
     * @return array{0: string, 1: list<string>}
     */
    public function foldedMatch(string $columnSql): array
    {
        $words = $this->foldedWords() ?: [''];
        $conditions = array_fill(0, count($words), "search_fold({$columnSql}) LIKE ?");

        return ['('.implode(' AND ', $conditions).')', array_map(self::containsPatternOf(...), $words)];
    }

    /**
     * Khớp nguyên văn, không phân biệt hoa/thường — cho email, số điện thoại, mã.
     *
     * @return array{0: string, 1: list<string>}
     */
    public function plainMatch(string $columnSql): array
    {
        return ["{$columnSql} ILIKE ?", [$this->containsPattern()]];
    }

    /**
     * Fold ngay trong SQL để luật bỏ dấu và ký tự ngăn cách chỉ sống ở một chỗ.
     *
     * @return list<string>
     */
    public function foldedWords(): array
    {
        if ($this->foldedWords === null) {
            $folded = (string) DB::scalar('SELECT search_fold(?)', [$this->raw]);
            $this->foldedWords = array_values(array_unique(preg_split('/\s+/u', $folded, flags: PREG_SPLIT_NO_EMPTY) ?: []));
        }

        return $this->foldedWords;
    }

    private static function containsPatternOf(string $text): string
    {
        return '%'.strtr($text, self::LIKE_ESCAPES).'%';
    }
}
