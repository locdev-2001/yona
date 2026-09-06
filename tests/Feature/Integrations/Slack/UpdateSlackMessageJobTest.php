<?php

use App\Jobs\Integrations\UpdateSlackMessageJob;
use App\Models\Integrations\Hook;
use App\Models\Message;
use Illuminate\Support\Facades\Http;

// Port từ spec/jobs/update_slack_message_job_spec.rb.

it('gọi UpdateSlackMessageService', function () {
    $hook = Hook::factory()->create(['reference_id' => 'C1']);
    $message = Message::factory()->create([
        'account_id' => $hook->account_id,
        'content' => 'Pick one',
        'message_type' => Message::TYPE_OUTGOING,
        'content_type' => Message::CONTENT_TYPES['input_select'],
        'content_attributes' => ['items' => [['title' => 'Option A', 'value' => 'a']], 'submitted_values' => [['title' => 'Option A', 'value' => 'a']]],
        'external_source_ids' => ['slack' => 'cw-origin-1'],
    ]);
    Http::fake(['https://slack.com/api/chat.update' => Http::response(['ok' => true])]);

    (new UpdateSlackMessageJob($message, $hook))->handle();

    Http::assertSent(fn ($request) => $request->url() === 'https://slack.com/api/chat.update');
});
