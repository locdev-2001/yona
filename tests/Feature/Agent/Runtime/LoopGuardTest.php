<?php

use App\Agent\Runtime\LoopGuard;
use App\Agent\ValueObjects\ToolCall;

it('allows max steps plus one grace step', function () {
    $guard = new LoopGuard(2);
    $graceSteps = [];

    while ($guard->mayCallModel()) {
        $graceSteps[] = $guard->isGraceStep();
        $guard->countModelCall();
    }

    expect($graceSteps)->toBe([false, false, true]);
});

it('halts on the third identical call with an identical result, whatever the key order', function () {
    $guard = new LoopGuard(6);
    $guard->observe(new ToolCall('a', 'search_knowledge', ['query' => 'áo', 'limit' => 3]), '{"ok":true}');
    $guard->observe(new ToolCall('b', 'search_knowledge', ['limit' => 3, 'query' => 'áo']), '{"ok":true}');
    expect($guard->halted())->toBeFalse();

    $guard->observe(new ToolCall('c', 'search_knowledge', ['query' => 'áo', 'limit' => 3]), '{"ok":true}');
    expect($guard->halted())->toBeTrue();
});

it('does not halt when the result changes', function () {
    $guard = new LoopGuard(6);

    foreach (['{"ok":true,"data":[1]}', '{"ok":true,"data":[2]}', '{"ok":true,"data":[3]}'] as $index => $result) {
        $guard->observe(new ToolCall("c{$index}", 'search_knowledge', ['query' => 'áo']), $result);
    }

    expect($guard->halted())->toBeFalse();
});

it('halts on a short cycle repeated three times', function () {
    $guard = new LoopGuard(10);

    foreach (range(1, 3) as $lap) {
        $guard->observe(new ToolCall("a{$lap}", 'search_knowledge', ['query' => 'áo']), '{"ok":true,"data":[]}');
        expect($guard->halted())->toBeFalse();
        $guard->observe(new ToolCall("b{$lap}", 'search_knowledge', ['query' => 'quần']), '{"ok":true,"data":[]}');
    }

    expect($guard->halted())->toBeTrue();
});
