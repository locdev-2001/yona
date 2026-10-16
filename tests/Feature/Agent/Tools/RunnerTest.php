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

it('declares the lookups, the actions and the three terminal tools named by the registry', function () {
    $specs = app(Registry::class)->specs();
    $named = fn (ToolKind $kind) => array_values(array_map(fn ($spec) => $spec->name, array_filter($specs, fn ($spec) => $spec->kind === $kind)));

    expect($named(ToolKind::Read))->toEqualCanonicalizing(['search_knowledge', 'search_products', 'get_customer_profile'])
        ->and($named(ToolKind::Action))->toEqualCanonicalizing(['send_product_card', 'send_quick_replies', 'send_bank_transfer', 'save_customer_info', 'tag_conversation', 'add_private_note'])
        ->and($named(ToolKind::Terminal))->toEqualCanonicalizing(app(Registry::class)->terminalNames());
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
    'too few options' => [new ToolCall('c8', 'send_quick_replies', ['question' => 'Size?', 'options' => ['M']]), 'invalid_args', 'at least 2 items'],
    'repeated product' => [new ToolCall('c9', 'send_product_card', ['product_ids' => ['1:a', '1:a']]), 'invalid_args', 'must not repeat'],
    'nested object field missing' => [new ToolCall('c10', 'save_customer_info', ['custom_fields' => [['key' => 'size']]]), 'invalid_args', '`value` is required'],
    'nested object unknown field' => [new ToolCall('c11', 'save_customer_info', ['custom_fields' => [['key' => 'size', 'value' => 'M', 'x' => 1]]]), 'invalid_args', 'Unknown argument(s): x'],
    'amount as text' => [new ToolCall('c12', 'send_bank_transfer', ['amount' => '300000']), 'invalid_args', 'must be an integer'],
    'source not looked up' => [new ToolCall('c7', 'reply', ['text' => 'Dạ còn ạ', 'sources' => ['article:9']]), 'unknown_ref', 'article:9'],
]);

it('accepts a reply citing a ref returned in this turn', function () {
    $evidence = new TurnEvidence(['{"ok":true,"data":[{"ref":"article:9","excerpt":"Ship toàn quốc 30.000đ"}]}']);

    expect(app(Runner::class)->validate(new ToolCall('c1', 'reply', ['text' => 'Dạ ship 30k ạ', 'sources' => ['article:9']]), $evidence))->toBeNull();
});
