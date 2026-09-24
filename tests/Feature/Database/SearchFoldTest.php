<?php

use App\Models\Account;
use App\Models\Attachment;
use App\Models\Contact;
use App\Models\Message;
use App\Search\Drivers\PostgresSearchEngine;
use App\Services\SearchService;
use App\Support\SearchTerm;
use Illuminate\Database\Eloquent\Model;
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

// Luật xếp hạng liên quan cũng có hai bản: SQL của SearchTerm và searchFold.ts
// cho danh sách tìm ngay ở giao diện. Hai bên đọc chung một file ca kiểm.
function searchRelevanceCases(): array
{
    $cases = json_decode(
        (string) file_get_contents(dirname(__DIR__, 3).'/resources/js/shared/helpers/searchRelevance.cases.json'),
        true,
        flags: JSON_THROW_ON_ERROR,
    );

    return collect($cases)
        ->mapWithKeys(fn (array $case) => [
            json_encode("{$case['query']} → {$case['text']}", JSON_UNESCAPED_UNICODE) => [$case['text'], $case['query'], $case['relevance']],
        ])
        ->all();
}

function foldedSearchIndexes(): array
{
    return array_column(foldedSearchColumns(), 2);
}

/** @return array<string, array{0: class-string<Model>, 1: string, 2: string}> */
function foldedSearchColumns(): array
{
    return [
        'message content' => [Message::class, 'messages.content', 'index_messages_on_folded_content'],
        'group member name' => [Message::class, PostgresSearchEngine::GROUP_SENDER_NAME_SQL, 'index_messages_on_folded_group_sender_name'],
        'contact name' => [Contact::class, 'contacts.name', 'index_contacts_on_folded_name'],
        'file name' => [Attachment::class, Attachment::DISPLAY_NAME_SQL, 'index_attachments_on_folded_display_name'],
    ];
}

function explainedPlan(string $sql, array $bindings): string
{
    return collect(DB::select("EXPLAIN {$sql}", $bindings))->pluck('QUERY PLAN')->implode("\n");
}

it('folds every shared case exactly like the frontend helper', function (string $input, string $folded) {
    expect(DB::selectOne('SELECT search_fold(?) AS folded', [$input])->folded)->toBe($folded);
})->with(searchFoldCases());

it('matches and ranks every shared relevance case exactly like the frontend helper', function (string $text, string $query, ?int $relevance) {
    $term = new SearchTerm($query);
    [$condition, $matchBindings] = $term->foldedMatch('sample.subject');
    [$rankSql, $rankBindings] = $term->relevanceRank('sample.subject');

    $row = DB::selectOne(
        "SELECT {$condition} AS matched, {$rankSql} AS relevance FROM (SELECT CAST(? AS text) AS subject) AS sample",
        [...$matchBindings, ...$rankBindings, $text],
    );

    expect($row->matched)->toBe($relevance !== null);

    if ($relevance !== null) {
        expect($row->relevance)->toBe($relevance);
    }
})->with(searchRelevanceCases());

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
it('lets the search expression use its folded trigram index', function (string $model, string $columnSql, string $index) {
    DB::statement('SET LOCAL enable_seqscan = off');
    $table = (new $model)->getTable();
    [$condition, $bindings] = (new SearchTerm('bao gia'))->foldedMatch($columnSql);

    expect(explainedPlan("SELECT {$table}.id FROM {$table} WHERE {$condition}", $bindings))->toContain($index);
})->with(foldedSearchColumns());

// Xếp hạng liên quan chỉ nằm ở ORDER BY: phần lọc vẫn phải đi qua index trigram.
it('keeps the folded trigram index usable when ordering by relevance', function (string $model, string $columnSql, string $index) {
    DB::statement('SET LOCAL enable_seqscan = off');
    $term = new SearchTerm('bao gia');
    $query = $term->orderByRelevance($model::query()->select('id')->whereRaw(...$term->foldedMatch($columnSql)), $columnSql)
        ->orderByDesc('created_at')
        ->orderByDesc('id')
        ->limit(SearchService::RESULTS_PER_PAGE);

    expect(explainedPlan($query->toSql(), $query->getBindings()))->toContain($index)->toContain('Sort');
})->with(foldedSearchColumns());

it('splits the folded query into distinct words', function (string $query, array $words) {
    expect((new SearchTerm($query))->foldedWords())->toBe($words);
})->with([
    'accents and separators' => [' Bảng-giá_SỈ  bang ', ['bang', 'gia', 'si']],
    'file name' => ['bao-gia_thang-9.pdf', ['bao', 'gia', 'thang', '9', 'pdf']],
    'only separators' => [' -_./ ', []],
    'empty' => ['', []],
]);

it('requires every word on the same folded column', function () {
    [$condition, $bindings] = (new SearchTerm('gia bao-gia 50%'))->foldedMatch('messages.content');

    expect($condition)->toBe('(search_fold(messages.content) LIKE ? AND search_fold(messages.content) LIKE ? AND search_fold(messages.content) LIKE ?)')
        ->and($bindings)->toBe(['%gia%', '%bao%', '%50\\%%']);
});

it('does not filter the column when the query has no word left', function () {
    expect((new SearchTerm(' - '))->foldedMatch('contacts.name'))->toBe(['(search_fold(contacts.name) LIKE ?)', ['%%']]);
});

// Index biểu thức phải được dựng theo đúng thân hàm hiện tại: tắt seqscan thì chỉ
// còn đường qua index, và đường đó vẫn phải ra tệp tên nối bằng gạch.
it('finds separator-joined names through the folded index', function () {
    $account = Account::factory()->create();
    Contact::factory()->create(['account_id' => $account->id, 'name' => 'bao-gia_thang-9.pdf']);
    Contact::factory()->create(['account_id' => $account->id, 'name' => 'hop-dong.pdf']);
    DB::statement('SET LOCAL enable_seqscan = off');
    [$condition, $bindings] = (new SearchTerm('thang 9 bao gia'))->foldedMatch('contacts.name');

    expect(DB::table('contacts')->whereRaw($condition, $bindings)->pluck('name')->all())->toBe(['bao-gia_thang-9.pdf']);
});
