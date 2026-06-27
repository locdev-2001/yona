<?php

use App\Modules\TopoSort;

it('sorts with no dependencies', function () {
    $sorted = TopoSort::sort(['a' => [], 'b' => [], 'c' => []]);
    expect($sorted)->toContain('a', 'b', 'c');
});

it('sorts so dependency comes before dependent', function () {
    // b depends on a → a must appear before b
    $sorted = TopoSort::sort(['b' => ['a'], 'a' => []]);
    expect(array_search('a', $sorted))->toBeLessThan(array_search('b', $sorted));
});

it('sorts chain a → b → c', function () {
    $sorted = TopoSort::sort(['c' => ['b'], 'b' => ['a'], 'a' => []]);
    expect(array_search('a', $sorted))->toBeLessThan(array_search('b', $sorted));
    expect(array_search('b', $sorted))->toBeLessThan(array_search('c', $sorted));
});

it('throws on cyclic dependency', function () {
    TopoSort::sort(['a' => ['b'], 'b' => ['a']]);
})->throws(RuntimeException::class, 'Cyclic');

it('sorts provider (depends consumer) after consumer — F10 override order', function () {
    // consumer = 'inbox' (no deps), provider = 'channel-zalo' (depends inbox)
    $sorted = TopoSort::sort([
        'channel-zalo' => ['inbox'],
        'inbox' => [],
    ]);
    expect(array_search('inbox', $sorted))->toBeLessThan(array_search('channel-zalo', $sorted));
});
