<?php

use App\Jobs\Inboxes\FetchImapEmailsJob;
use App\Models\Account;
use App\Support\Queue\SlowJobBreakdown;
use Illuminate\Contracts\Queue\Job;
use Illuminate\Queue\Events\JobProcessed;
use Illuminate\Queue\Events\JobProcessing;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Laravel\Pulse\Recorders\Concerns\Thresholds;
use Laravel\Pulse\Recorders\SlowJobs;

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

it('job IMAP chạy hơn một giây không bị cảnh báo nhưng job khác vẫn giữ ngưỡng chung', function () {
    Log::spy();
    $imapJob = Mockery::mock(Job::class);
    $imapJob->allows('payload')->andReturn([]);
    $imapJob->allows('resolveName')->andReturn(FetchImapEmailsJob::class);
    $imapJob->allows('getQueue')->andReturn('default');

    event(new JobProcessing('redis', $imapJob));
    usleep(1_100_000);
    event(new JobProcessed('redis', $imapJob));
    Log::shouldNotHaveReceived('warning', fn (string $message) => $message === SlowJobBreakdown::LOG_MESSAGE);

    $otherJob = slowJobBreakdownFakeJob();
    event(new JobProcessing('redis', $otherJob));
    usleep(1_100_000);
    event(new JobProcessed('redis', $otherJob));
    Log::shouldHaveReceived('warning')->withArgs(fn (string $message, array $context) => $message === SlowJobBreakdown::LOG_MESSAGE
        && $context['job'] === 'App\\Jobs\\SendReplyJob');
});

it('Pulse và log dùng chung ngưỡng 10 giây cho IMAP, tên job khác giữ ngưỡng 1 giây', function () {
    $thresholds = new class
    {
        use Thresholds;

        public function milliseconds(string $jobName): int
        {
            return $this->threshold($jobName, SlowJobs::class);
        }
    };

    expect($thresholds->milliseconds(FetchImapEmailsJob::class))->toBe(10000)
        ->and($thresholds->milliseconds('App\\Jobs\\SendReplyJob'))->toBe(1000)
        ->and($thresholds->milliseconds(FetchImapEmailsJob::class.'Extra'))->toBe(1000);
});

it('IMAP vượt ngưỡng riêng vẫn ghi cảnh báo hiệu năng', function () {
    config(['pulse.recorders.'.SlowJobs::class.'.threshold' => [
        '/^'.preg_quote(FetchImapEmailsJob::class, '/').'$/' => 10,
        'default' => 1000,
    ]]);
    Log::spy();
    $job = Mockery::mock(Job::class);
    $job->allows('payload')->andReturn([]);
    $job->allows('resolveName')->andReturn(FetchImapEmailsJob::class);
    $job->allows('getQueue')->andReturn('default');

    event(new JobProcessing('redis', $job));
    usleep(20_000);
    event(new JobProcessed('redis', $job));

    Log::shouldHaveReceived('warning')->withArgs(fn (string $message, array $context) => $message === SlowJobBreakdown::LOG_MESSAGE
        && $context['job'] === FetchImapEmailsJob::class
        && $context['total_ms'] >= 10);
});
