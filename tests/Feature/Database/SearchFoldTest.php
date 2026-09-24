<?php

use App\Models\Attachment;
use App\Services\SearchService;
use App\Support\SearchTerm;
use Illuminate\Support\Facades\DB;

// search_fold là luật bỏ dấu phía máy chủ; resources/js/shared/helpers/searchFold.ts
// là bản sao phía giao diện để tô sáng. Hai bên đọc chung một file ca kiểm.
function searchFoldCases(): array
{
    $cases = json_decode(
        (string) file_get_contents(dirname(__DIR__, 3).'/resources/js/shared/helpers/searchFold.cases.json'),
        true,
        flags: JSON_THROW_ON_ERROR,
    );

    return collect($cases)
        ->mapWithKeys(fn (array $case) => [json_encode($case['input'], JSON_UNESCAPED_UNICODE) => [$case['input'], $case['folded']]])
        ->all();
}

function foldedSearchIndexes(): array
{
    return [
        'index_messages_on_folded_content',
        'index_messages_on_folded_group_sender_name',
        'index_contacts_on_folded_name',
        'index_attachments_on_folded_display_name',
    ];
}

it('folds every shared case exactly like the frontend helper', function (string $input, string $folded) {
    expect(DB::selectOne('SELECT search_fold(?) AS folded', [$input])->folded)->toBe($folded);
})->with(searchFoldCases());

it('keeps NULL as NULL', function () {
    expect(DB::selectOne('SELECT search_fold(NULL) AS folded')->folded)->toBeNull();
});

it('is immutable so expression indexes can use it', function () {
    expect(DB::selectOne("SELECT provolatile FROM pg_proc WHERE proname = 'search_fold'")->provolatile)->toBe('i');
});

it('has every folded trigram index built and valid', function () {
    $indexes = collect(DB::select(
        'SELECT pg_class.relname AS name, pg_index.indisvalid AS valid FROM pg_index'
        .' JOIN pg_class ON pg_class.oid = pg_index.indexrelid WHERE pg_class.relname = ANY(?)',
        ['{'.implode(',', foldedSearchIndexes()).'}'],
    ))->pluck('valid', 'name')->all();

    expect(array_keys($indexes))->toEqualCanonicalizing(foldedSearchIndexes())
        ->and(array_unique(array_values($indexes)))->toBe([true]);
});

// Biểu thức truy vấn lệch biểu thức index một ký tự là planner im lặng quét cả
// bảng. Tắt seqscan: còn dùng được index thì plan phải đi qua đúng index đó.
it('lets the search expression use its folded trigram index', function (string $table, string $columnSql, string $index) {
    DB::statement('SET LOCAL enable_seqscan = off');
    [$condition, $bindings] = (new SearchTerm('bao gia'))->foldedMatch($columnSql);

    $plan = collect(DB::select("EXPLAIN SELECT {$table}.id FROM {$table} WHERE {$condition}", $bindings))
        ->pluck('QUERY PLAN')
        ->implode("\n");

    expect($plan)->toContain($index);
})->with([
    'message content' => ['messages', 'messages.content', 'index_messages_on_folded_content'],
    'group member name' => ['messages', SearchService::GROUP_SENDER_NAME_SQL, 'index_messages_on_folded_group_sender_name'],
    'contact name' => ['contacts', 'contacts.name', 'index_contacts_on_folded_name'],
    'file name' => ['attachments', Attachment::DISPLAY_NAME_SQL, 'index_attachments_on_folded_display_name'],
]);
