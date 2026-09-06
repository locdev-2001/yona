<?php

use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Integrations\Hook;
use App\Models\Message;
use App\Services\Integrations\Slack\UpdateSlackMessageService;
use Illuminate\Support\Facades\Http;

// Port từ spec/lib/integrations/slack/update_slack_message_service_spec.rb.

beforeEach(function () {
    $this->contact = Contact::factory()->create();
    $this->inbox = Inbox::factory()->email()->create(['account_id' => $this->contact->account_id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->contact->account_id,
        'inbox_id' => $this->inbox->id,
        'contact_id' => $this->contact->id,
        'identifier' => '12345.6789',
    ]);
    $this->hook = Hook::factory()->create(['account_id' => $this->contact->account_id, 'reference_id' => 'C123']);
});

function makeInteractiveMessage(array $overrides): Message
{
    return Message::factory()->create(array_merge([
        'account_id' => test()->conversation->account_id,
        'inbox_id' => test()->conversation->inbox_id,
        'conversation_id' => test()->conversation->id,
        'message_type' => Message::TYPE_OUTGOING,
        'external_source_ids' => ['slack' => 'cw-origin-6789.12345'],
    ], $overrides));
}

it('cập nhật tin Slack với lựa chọn đã chọn (input_select)', function () {
    Http::fake(['https://slack.com/api/chat.update' => Http::response(['ok' => true])]);

    $message = makeInteractiveMessage([
        'content_type' => Message::CONTENT_TYPES['input_select'],
        'content' => 'Pick one',
        'content_attributes' => [
            'items' => [['title' => 'Option A', 'value' => 'a'], ['title' => 'Option B', 'value' => 'b']],
            'submitted_values' => [['title' => 'Option A', 'value' => 'a']],
        ],
    ]);

    (new UpdateSlackMessageService($message, $this->hook))->perform();

    Http::assertSent(fn ($request) => $request->url() === 'https://slack.com/api/chat.update'
        && $request['channel'] === 'C123'
        && $request['ts'] === '6789.12345'
        && str_contains($request['text'], 'Pick one')
        && str_contains($request['text'], 'Option A'));
});

it('cập nhật tin Slack với toàn bộ trường đã điền (form)', function () {
    Http::fake(['https://slack.com/api/chat.update' => Http::response(['ok' => true])]);

    $message = makeInteractiveMessage([
        'content_type' => Message::CONTENT_TYPES['form'],
        'content' => 'Please fill this',
        'content_attributes' => [
            'items' => [['name' => 'email', 'label' => 'Email'], ['name' => 'company', 'label' => 'Company']],
            'submitted_values' => [['name' => 'email', 'value' => 'a@example.com'], ['name' => 'company', 'value' => 'Acme']],
        ],
    ]);

    (new UpdateSlackMessageService($message, $this->hook))->perform();

    Http::assertSent(function ($request) {
        $text = $request['text'];

        return str_contains($text, 'Please fill this') && str_contains($text, 'Email: a@example.com') && str_contains($text, 'Company: Acme');
    });
});

it('cập nhật tin Slack với rating + feedback CSAT', function () {
    Http::fake(['https://slack.com/api/chat.update' => Http::response(['ok' => true])]);

    $message = makeInteractiveMessage([
        'content_type' => Message::CONTENT_TYPES['input_csat'],
        'content' => 'Rate us',
        'content_attributes' => [
            'submitted_values' => ['csat_survey_response' => ['rating' => 5, 'feedback_message' => 'Great support!']],
        ],
    ]);

    (new UpdateSlackMessageService($message, $this->hook))->perform();

    Http::assertSent(function ($request) {
        $text = $request['text'];

        return str_contains($text, 'Rate us') && str_contains($text, 'Rating: 5') && str_contains($text, 'Great support!');
    });
});

it('cập nhật tin Slack với email đã gửi (input_email)', function () {
    Http::fake(['https://slack.com/api/chat.update' => Http::response(['ok' => true])]);

    $message = makeInteractiveMessage([
        'content_type' => Message::CONTENT_TYPES['input_email'],
        'content' => 'Get notified by email',
        'content_attributes' => ['submitted_email' => 'user@example.com'],
    ]);

    (new UpdateSlackMessageService($message, $this->hook))->perform();

    Http::assertSent(fn ($request) => str_contains($request['text'], 'Get notified by email') && str_contains($request['text'], 'user@example.com'));
});

it('bỏ qua khi chưa có câu trả lời nào', function () {
    Http::fake();

    $message = makeInteractiveMessage([
        'content_type' => Message::CONTENT_TYPES['input_select'],
        'content_attributes' => ['items' => [['title' => 'Option A', 'value' => 'a']]],
    ]);

    (new UpdateSlackMessageService($message, $this->hook))->perform();

    Http::assertNothingSent();
});

it('bỏ qua khi tin không xuất phát từ Chatwoot', function () {
    Http::fake();

    $message = makeInteractiveMessage([
        'content_type' => Message::CONTENT_TYPES['input_select'],
        'content_attributes' => ['submitted_values' => [['title' => 'Option A', 'value' => 'a']]],
        'external_source_ids' => ['slack' => '6789.12345'],
    ]);

    (new UpdateSlackMessageService($message, $this->hook))->perform();

    Http::assertNothingSent();
});

it('bỏ qua khi hook không có reference_id', function () {
    Http::fake();
    $hookWithoutRef = Hook::factory()->create(['account_id' => $this->contact->account_id, 'reference_id' => null]);

    $message = makeInteractiveMessage([
        'content_type' => Message::CONTENT_TYPES['input_select'],
        'content_attributes' => ['submitted_values' => [['title' => 'Option A', 'value' => 'a']]],
    ]);

    (new UpdateSlackMessageService($message, $hookWithoutRef))->perform();

    Http::assertNothingSent();
});

it('vô hiệu hoá hook khi Slack trả lỗi xác thực', function () {
    Http::fake(['https://slack.com/api/chat.update' => Http::response(['ok' => false, 'error' => 'account_inactive'])]);

    $message = makeInteractiveMessage([
        'content_type' => Message::CONTENT_TYPES['input_select'],
        'content_attributes' => ['submitted_values' => [['title' => 'Option A', 'value' => 'a']]],
    ]);

    (new UpdateSlackMessageService($message, $this->hook))->perform();

    expect($this->hook->refresh()->isDisabled())->toBeTrue();
});

it('bỏ qua trong im lặng khi tin gốc trên Slack không còn tồn tại', function () {
    Http::fake(['https://slack.com/api/chat.update' => Http::response(['ok' => false, 'error' => 'message_not_found'])]);

    $message = makeInteractiveMessage([
        'content_type' => Message::CONTENT_TYPES['input_select'],
        'content_attributes' => ['submitted_values' => [['title' => 'Option A', 'value' => 'a']]],
    ]);

    (new UpdateSlackMessageService($message, $this->hook))->perform();

    expect($this->hook->refresh()->isDisabled())->toBeFalse();
});
