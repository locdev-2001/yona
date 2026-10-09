<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Từ khoá người dùng gõ vào ô tìm kiếm — nguồn duy nhất dựng mệnh đề "chứa từ
 * khoá" và thứ hạng liên quan cho truy vấn tìm. Ký tự đại diện của LIKE trong từ
 * khoá được coi là chữ thường. Chữ người đọc khớp theo từng từ: từ khoá qua hàm SQL
 * `search_fold` (cùng luật với resources/js/shared/helpers/searchFold.ts) rồi tách
 * theo khoảng trắng, mỗi từ phải có mặt nhưng không cần liền nhau hay đúng thứ tự.
 */
final class SearchTerm
{
    private const LIKE_ESCAPES = ['\\' => '\\\\', '%' => '\\%', '_' => '\\_'];

    // Mức liên quan, số nhỏ đứng trước — xem orderByRelevance().
    private const RANK_EXACT_PHRASE = 0;

    private const RANK_WHOLE_WORDS = 1;

    private const RANK_PARTIAL_WORDS = 2;

    // Mức khớp khi gợi ý theo tên — xem leadingMatchRank().
    private const RANK_WHOLE_VALUE = 0;

    private const RANK_LEADING = 1;

    private const RANK_INSIDE = 2;

    // Một từ "đứng trọn" khi hai bên không dính chữ hay số (regex PostgreSQL).
    private const WHOLE_WORD_PATTERN = '(?<![[:alnum:]])%s(?![[:alnum:]])';

    private const PHRASE_WORD_GAP = '\s+';

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

    // Giao diện hiện mã hội thoại dạng "#123" — người dùng gõ lại y như vậy.
    public function withoutIdPrefix(): self
    {
        return new self(ltrim($this->raw, '#'));
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
     * Xếp các dòng đã khớp foldedMatch theo mức liên quan, tốt nhất trước:
     * cả cụm từ khoá liền nhau, mỗi từ đứng trọn ("báo giá tháng 9") → đủ các từ
     * đứng trọn nhưng rời nhau ("báo … giá") → còn lại, tức có từ chỉ là một phần
     * của từ dài hơn ("gia" trong "giao") hoặc dòng chỉ khớp qua cột nguyên văn.
     * Nhiều cột thì lấy mức tốt nhất. Chỉ xếp, không lọc — tập kết quả vẫn do
     * foldedMatch quyết. Từ khoá không còn từ nào thì mọi dòng ngang hạng.
     *
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    public function orderByRelevance(Builder $query, string ...$columnSqls): Builder
    {
        $relevance = $this->relevanceRank(...$columnSqls);

        return $relevance === null ? $query : $query->orderByRaw(...$relevance);
    }

    /**
     * Biểu thức SQL ra mức liên quan (số nguyên) của orderByRelevance. Giao diện
     * xếp theo cùng luật ở searchFold.ts; hai bên kiểm chung searchRelevance.cases.json.
     *
     * @return array{0: string, 1: list<string>}|null
     */
    public function relevanceRank(string ...$columnSqls): ?array
    {
        $words = $this->foldedWords();

        if ($words === [] || $columnSqls === []) {
            return null;
        }

        $escapedWords = array_map(preg_quote(...), $words);
        $phrasePattern = self::wholeWordPatternOf(implode(self::PHRASE_WORD_GAP, $escapedWords));
        $wordPatterns = array_map(self::wholeWordPatternOf(...), $escapedWords);

        $ranks = [];
        $bindings = [];

        foreach ($columnSqls as $columnSql) {
            $folded = "search_fold({$columnSql})";
            $allWholeWords = implode(' AND ', array_fill(0, count($wordPatterns), "{$folded} ~ ?"));
            $ranks[] = "CASE WHEN {$folded} ~ ? THEN ".self::RANK_EXACT_PHRASE
                ." WHEN {$allWholeWords} THEN ".self::RANK_WHOLE_WORDS
                .' ELSE '.self::RANK_PARTIAL_WORDS.' END';
            array_push($bindings, $phrasePattern, ...$wordPatterns);
        }

        $rankSql = count($ranks) === 1 ? $ranks[0] : 'LEAST('.implode(', ', $ranks).')';

        return [$rankSql, $bindings];
    }

    /**
     * Mức khớp để gợi ý theo tên, tốt nhất trước: trùng khít cả giá trị → cụm từ
     * khoá đứng ở đầu chuỗi hoặc đầu một từ → còn lại (khớp một phần, hay dòng chỉ
     * khớp qua cột khác). Chữ người đọc so không dấu như foldedMatch; giá trị
     * nguyên văn (email, số điện thoại, mã) so không phân biệt hoa/thường. Nhiều
     * cột thì lấy mức tốt nhất. Chỉ xếp, không lọc.
     *
     * @param  list<string>  $foldedColumnSqls
     * @param  list<string>  $plainColumnSqls
     * @return array{0: string, 1: list<string>}|null
     */
    public function leadingMatchRank(array $foldedColumnSqls, array $plainColumnSqls = []): ?array
    {
        $words = $this->foldedWords();
        $ranks = [];
        $bindings = [];

        if ($words !== []) {
            $phrase = implode(self::PHRASE_WORD_GAP, array_map(preg_quote(...), $words));

            foreach ($foldedColumnSqls as $columnSql) {
                $folded = "search_fold({$columnSql})";
                $ranks[] = "CASE WHEN {$folded} ~ ? THEN ".self::RANK_WHOLE_VALUE
                    ." WHEN {$folded} ~ ? THEN ".self::RANK_LEADING
                    .' ELSE '.self::RANK_INSIDE.' END';
                array_push($bindings, '^\s*'.$phrase.'\s*$', self::leadingWordPatternOf($phrase));
            }
        }

        if ($this->raw !== '') {
            foreach ($plainColumnSqls as $columnSql) {
                $ranks[] = "CASE WHEN lower({$columnSql}) = lower(?) THEN ".self::RANK_WHOLE_VALUE
                    ." WHEN {$columnSql} ILIKE ? THEN ".self::RANK_LEADING
                    .' ELSE '.self::RANK_INSIDE.' END';
                array_push($bindings, $this->raw, strtr($this->raw, self::LIKE_ESCAPES).'%');
            }
        }

        if ($ranks === []) {
            return null;
        }

        return [count($ranks) === 1 ? $ranks[0] : 'LEAST('.implode(', ', $ranks).')', $bindings];
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

    private static function leadingWordPatternOf(string $escapedWords): string
    {
        return '(?<![[:alnum:]])'.$escapedWords;
    }

    private static function wholeWordPatternOf(string $escapedWords): string
    {
        return sprintf(self::WHOLE_WORD_PATTERN, $escapedWords);
    }
}
