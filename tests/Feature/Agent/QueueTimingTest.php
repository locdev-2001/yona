<?php

use App\Services\Conversations\ConversationFloor;

// Lượt AI chạy trên pool riêng; deadline lượt phải xong trước khi worker bị giết, và
// worker phải bị giết trước khi Redis trả job về hàng đợi cho worker khác.
it('giữ chuỗi deadline lượt < timeout supervisor-ai < retry_after', function () {
    $deadline = config('agent.turn.deadline_seconds');
    $workerTimeout = config('horizon.defaults.supervisor-ai.timeout');
    $retryAfter = config('queue.connections.redis.retry_after');

    expect($deadline)->toBeLessThan($workerTimeout)
        ->and($workerTimeout)->toBeLessThan($retryAfter)
        ->and(config('horizon.defaults.supervisor-ai.queue'))->toBe([config('agent.turn.queue')]);
});

it('keeps the AI turn inside its job: deadline + floor grace <= job timeout = worker timeout < lock expiry', function () {
    $turn = config('agent.turn');

    expect($turn['deadline_seconds'] + $turn['floor_grace_seconds'])->toBeLessThanOrEqual($turn['job_timeout_seconds'])
        ->and($turn['job_timeout_seconds'])->toBe(config('horizon.defaults.supervisor-ai.timeout'))
        ->and($turn['job_timeout_seconds'])->toBeLessThan($turn['lock_expire_seconds'])
        ->and($turn['job_timeout_seconds'])->toBeLessThan(config('queue.connections.redis.retry_after'))
        ->and($turn['deadline_seconds'] + $turn['floor_grace_seconds'])->toBeLessThanOrEqual(ConversationFloor::MAX_HOLD_SECONDS);
});
