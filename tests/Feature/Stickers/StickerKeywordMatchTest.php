<?php

use App\Services\Stickers\StickerKeywordMatch;
use Illuminate\Support\Facades\DB;

// Luật khớp từ khoá sticker có hai bản: SQL ở StickerKeywordMatch (gợi ý của máy
// chủ) và stickerSuggestionQuery.ts (widget lọc tại chỗ). Hai bên đọc chung một
// tệp case.
function stickerKeywordMatchCases(): array
{
    $cases = json_decode(
        (string) file_get_contents(dirname(__DIR__, 3).'/resources/js/shared/sticker/stickerKeywordMatch.cases.json'),
        true,
        flags: JSON_THROW_ON_ERROR,
    );

    return collect($cases)
        ->mapWithKeys(fn (array $case) => [
            json_encode("{$case['query']} → ".json_encode([$case['label'], $case['keywords']], JSON_UNESCAPED_UNICODE), JSON_UNESCAPED_UNICODE) => [$case['label'], $case['keywords'], $case['query'], $case['rank']],
        ])
        ->all();
}

it('xếp hạng mọi case dùng chung đúng như bản giao diện', function (?string $label, array $keywords, string $query, ?int $rank) {
    $rankSql = StickerKeywordMatch::rankFor($query);

    if ($rankSql === null) {
        expect($rank)->toBeNull();

        return;
    }

    [$sql, $bindings] = $rankSql;
    $row = DB::selectOne(
        "SELECT {$sql} AS rank FROM (SELECT CAST(? AS text) AS label, CAST(? AS jsonb) AS keywords) AS stickers",
        [...$bindings, $label, json_encode($keywords)],
    );

    expect($row->rank)->toBe($rank);
})->with(stickerKeywordMatchCases());
