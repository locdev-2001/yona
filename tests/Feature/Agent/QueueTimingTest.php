<?php

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
