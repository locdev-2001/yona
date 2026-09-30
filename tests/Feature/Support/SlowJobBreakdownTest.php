<?php

use App\Models\Account;
use App\Support\Queue\SlowJobBreakdown;
use Illuminate\Contracts\Queue\Job;
use Illuminate\Queue\Events\JobProcessed;
use Illuminate\Queue\Events\JobProcessing;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

function slowJobBreakdownFakeJob(): Job
{
    $job = Mockery::mock(Job::class);
    $job->allows('payload')->andReturn(['pushedAt' => (string) microtime(true)]);
    $job->allows('resolveName')->andReturn('App\\Jobs\\SendReplyJob');
    $job->allows('getQueue')->andReturn('media');

    return $job;
}

it('ghi job chậm kèm thời gian SQL, HTTP và phần còn lại', function () {
    Log::spy();
    Http::fake(['bridge.test/*' => Http::response(['ok' => true])]);
    SlowJobBreakdown::register(app('events'), thresholdMs: 0);
    $job = slowJobBreakdownFakeJob();

    event(new JobProcessing('redis', $job));
    Account::query()->count();
    Http::post('http://bridge.test/personal-messages/send');
    event(new JobProcessed('redis', $job));

    Log::shouldHaveReceived('warning')->withArgs(fn (string $message, array $context) => $message === SlowJobBreakdown::LOG_MESSAGE
        && $context['job'] === 'App\\Jobs\\SendReplyJob'
        && $context['queue'] === 'media'
        && $context['db_queries'] === 1
        && $context['http_calls'] === 1
        && $context['job_number_in_process'] === 1
        && is_int($context['waited_since_push_ms']));
});

it('không ghi job nhanh hơn ngưỡng và job chạy đồng bộ', function () {
    Log::spy();
    SlowJobBreakdown::register(app('events'));
    $job = slowJobBreakdownFakeJob();

    event(new JobProcessing('redis', $job));
    event(new JobProcessed('redis', $job));
    event(new JobProcessing('sync', $job));
    event(new JobProcessed('sync', $job));

    Log::shouldNotHaveReceived('warning', fn (string $message) => $message === SlowJobBreakdown::LOG_MESSAGE);
});
