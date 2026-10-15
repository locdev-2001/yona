<?php

use App\Agent\Contracts\Ports\KnowledgeReader;
use App\Agent\Tools\Runner\Registry;
use App\Agent\Tools\Runner\Runner;
use App\Agent\ValueObjects\ToolCall;
use App\Agent\ValueObjects\ToolKind;
use App\Agent\ValueObjects\TurnEvidence;

beforeEach(function () {
    app()->instance(KnowledgeReader::class, new class implements KnowledgeReader
    {
        public function search(int $accountId, string $query, int $limit): array
        {
            return [];
        }
    });
});

it('declares exactly four tools, with the three terminal ones named by the registry', function () {
    $specs = app(Registry::class)->specs();

    expect(array_map(fn ($spec) => $spec->name, $specs))->toEqualCanonicalizing(['search_knowledge', 'reply', 'handoff_to_human', 'wait_for_customer'])
        ->and(array_values(array_map(fn ($spec) => $spec->name, array_filter($specs, fn ($spec) => $spec->kind === ToolKind::Terminal))))
        ->toEqualCanonicalizing(app(Registry::class)->terminalNames());
});

it('turns a bad call into a tool result the model can fix', function (ToolCall $call, string $code, string $hint) {
    $result = app(Runner::class)->validate($call, new TurnEvidence);

    expect($result?->toArray()['error']['code'])->toBe($code)
        ->and($result->fix)->toContain($hint);
})->with([
    'unknown tool' => [new ToolCall('c1', 'send_cards', []), 'invalid_args', 'search_knowledge'],
    'missing argument' => [new ToolCall('c2', 'reply', []), 'invalid_args', '`text` is required'],
    'wrong type' => [new ToolCall('c3', 'search_knowledge', ['query' => 12]), 'invalid_args', 'must be a string'],
    'unknown argument' => [new ToolCall('c4', 'wait_for_customer', ['reason' => 'ok', 'mood' => 'happy']), 'invalid_args', 'mood'],
    'reason outside the closed set' => [new ToolCall('c5', 'handoff_to_human', ['reason' => 'tired', 'note' => 'x']), 'invalid_args', 'binding_info_missing'],
    'too long reply' => [new ToolCall('c6', 'reply', ['text' => str_repeat('a', 2001)]), 'invalid_args', 'at most 2000'],
    'source not looked up' => [new ToolCall('c7', 'reply', ['text' => 'Dạ còn ạ', 'sources' => ['article:9']]), 'unknown_ref', 'article:9'],
    'holding reply with an amount' => [new ToolCall('c8', 'handoff_to_human', ['reason' => 'binding_info_missing', 'note' => 'n', 'holding_reply' => 'Dạ ship 30k ạ']), 'unsourced_claim', '30000 VND'],
]);

it('accepts a reply citing a ref returned in this turn', function () {
    $evidence = new TurnEvidence(['{"ok":true,"data":[{"ref":"article:9","excerpt":"Ship toàn quốc 30.000đ"}]}']);

    expect(app(Runner::class)->validate(new ToolCall('c1', 'reply', ['text' => 'Dạ ship 30k ạ', 'sources' => ['article:9']]), $evidence))->toBeNull();
});
