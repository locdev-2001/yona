<?php

namespace App\Services\Stickers;

use Illuminate\Support\Facades\DB;

/**
 * Luật khớp cụm đang gõ với nhãn + từ khoá sticker (gợi ý khi gõ). Hai bên cùng
 * đưa về dạng so khớp: search_fold (bỏ dấu, đ → d, chữ thường, - _ . / thành
 * khoảng trắng) rồi gọn khoảng trắng. Một sticker khớp khi cụm gõ là tiền tố của
 * nhãn hay một từ khoá tính từ đầu một chữ bất kỳ. Hạng: trùng khớp trọn → tiền
 * tố của cả nhãn/từ khoá → tiền tố tính từ chữ sau; nhiều mục thì lấy hạng tốt
 * nhất. Bản giao diện ở resources/js/shared/sticker/stickerSuggestionQuery.ts,
 * hai bên kiểm chung bằng stickerKeywordMatch.cases.json.
 */
final class StickerKeywordMatch
{
    public const MIN_QUERY_LENGTH = 2;

    public const RANK_EXACT = 0;

    public const RANK_PREFIX = 1;

    public const RANK_WORD_PREFIX = 2;

    private const WORD_GAP = ' ';

    private const MATCH_FORM_SQL = "btrim(regexp_replace(search_fold(%s), '[ \\t\\n\\r\\f\\v]+', ' ', 'g'), ' ')";

    private const TERM_RANK_SQL = 'CASE WHEN %1$s = ? THEN '.self::RANK_EXACT
        .' WHEN starts_with(%1$s, ?) THEN '.self::RANK_PREFIX
        .' WHEN strpos(%1$s, ?) > 0 THEN '.self::RANK_WORD_PREFIX.' END';

    /**
     * Biểu thức SQL ra hạng khớp trên cột `stickers.label` + `stickers.keywords`,
     * NULL khi không khớp. Null khi cụm gõ quá ngắn để gợi ý.
     *
     * @return array{0: string, 1: list<string>}|null
     */
    public static function rankFor(string $query): ?array
    {
        $matchQuery = (string) DB::scalar('SELECT '.sprintf(self::MATCH_FORM_SQL, '?'), [$query]);

        if (mb_strlen($matchQuery) < self::MIN_QUERY_LENGTH) {
            return null;
        }

        $termBindings = [$matchQuery, $matchQuery, self::WORD_GAP.$matchQuery];
        $labelRank = self::termRankSql('stickers.label');
        $keywordRank = '(SELECT MIN('.self::termRankSql('keyword').') FROM jsonb_array_elements_text(stickers.keywords) AS keyword)';

        return ["LEAST({$labelRank}, {$keywordRank})", [...$termBindings, ...$termBindings]];
    }

    private static function termRankSql(string $columnSql): string
    {
        return sprintf(self::TERM_RANK_SQL, sprintf(self::MATCH_FORM_SQL, $columnSql));
    }
}
