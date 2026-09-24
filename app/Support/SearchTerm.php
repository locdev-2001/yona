<?php

namespace App\Support;

/**
 * Từ khoá người dùng gõ vào ô tìm kiếm — nguồn duy nhất dựng mệnh đề "chứa từ
 * khoá" cho truy vấn tìm. Ký tự đại diện của LIKE trong từ khoá được coi là chữ
 * thường. Khớp không dấu đi qua hàm SQL `search_fold`, cùng luật với
 * resources/js/shared/helpers/searchFold.ts.
 */
final class SearchTerm
{
    private const LIKE_ESCAPES = ['\\' => '\\\\', '%' => '\\%', '_' => '\\_'];

    private readonly string $raw;

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
        return '%'.strtr($this->raw, self::LIKE_ESCAPES).'%';
    }

    /**
     * Khớp không dấu, không phân biệt hoa/thường — cho chữ người đọc (tên, nội dung, tên tệp).
     *
     * @return array{0: string, 1: list<string>}
     */
    public function foldedMatch(string $columnSql): array
    {
        return ["search_fold({$columnSql}) LIKE search_fold(?)", [$this->containsPattern()]];
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
}
