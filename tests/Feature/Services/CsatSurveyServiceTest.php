<?php

use App\Models\Channel\Api;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Label;
use App\Models\Message;
use App\Services\CsatSurveyService;

// Port từ spec/services/csat_survey_service_spec.rb — bỏ hai nhóm ca mẫu
// WhatsApp Cloud / Twilio (kênh chưa port, xem ghi chú trong service).

function csatConversation(array $inboxAttributes = [], array $conversationAttributes = []): Conversation
{
    $inbox = Inbox::factory()->create(['csat_survey_enabled' => true, ...$inboxAttributes]);

    return Conversation::factory()->create([
        'account_id' => $inbox->account_id,
        'inbox_id' => $inbox->id,
        'status' => Conversation::STATUS_RESOLVED,
        ...$conversationAttributes,
    ]);
}

function csatMessages(Conversation $conversation)
{
    return $conversation->messages()->where('content_type', Message::CONTENT_TYPES['input_csat']);
}

it('sends the survey when the conversation is resolved and csat is on', function () {
    $conversation = csatConversation();

    (new CsatSurveyService($conversation))->perform();

    expect(csatMessages($conversation)->count())->toBe(1);
});

it('does nothing when the conversation is not resolved', function () {
    $conversation = csatConversation(conversationAttributes: ['status' => Conversation::STATUS_OPEN]);

    (new CsatSurveyService($conversation))->perform();

    expect(csatMessages($conversation)->count())->toBe(0);
});

it('does nothing when csat is disabled on the inbox', function () {
    $conversation = csatConversation(['csat_survey_enabled' => false]);

    (new CsatSurveyService($conversation))->perform();

    expect(csatMessages($conversation)->count())->toBe(0);
});

it('does not send the survey twice', function () {
    $conversation = csatConversation();

    (new CsatSurveyService($conversation))->perform();
    (new CsatSurveyService($conversation))->perform();

    expect(csatMessages($conversation)->count())->toBe(1);
});

it('skips the survey when a does_not_contain rule matches a label on the conversation', function () {
    $conversation = csatConversation(['csat_config' => [
        'survey_rules' => ['operator' => 'does_not_contain', 'values' => ['bot-detectado']],
    ]]);
    Label::factory()->create(['account_id' => $conversation->account_id, 'title' => 'bot-detectado']);
    $conversation->updateLabels(['bot-detectado']);

    (new CsatSurveyService($conversation->fresh()))->perform();

    expect(csatMessages($conversation)->count())->toBe(0);
});

it('sends the survey when a contains rule matches a label on the conversation', function () {
    $conversation = csatConversation(['csat_config' => [
        'survey_rules' => ['operator' => 'contains', 'values' => ['vip']],
    ]]);
    Label::factory()->create(['account_id' => $conversation->account_id, 'title' => 'vip']);
    $conversation->updateLabels(['vip']);

    (new CsatSurveyService($conversation->fresh()))->perform();

    expect(csatMessages($conversation)->count())->toBe(1);
});

it('skips the survey when a contains rule matches no label on the conversation', function () {
    $conversation = csatConversation(['csat_config' => [
        'survey_rules' => ['operator' => 'contains', 'values' => ['vip']],
    ]]);

    (new CsatSurveyService($conversation))->perform();

    expect(csatMessages($conversation)->count())->toBe(0);
});

it('ignores an empty rule list', function () {
    $conversation = csatConversation(['csat_config' => [
        'survey_rules' => ['operator' => 'contains', 'values' => []],
    ]]);

    (new CsatSurveyService($conversation))->perform();

    expect(csatMessages($conversation)->count())->toBe(1);
});

it('records an activity message instead of the survey outside the messaging window', function () {
    $channel = Api::factory()->create(['additional_attributes' => ['agent_reply_time_window' => 12]]);
    $conversation = csatConversation([
        'account_id' => $channel->account_id,
        'channel_id' => $channel->id,
        'channel_type' => $channel->getMorphClass(),
    ]);

    (new CsatSurveyService($conversation))->perform();

    expect(csatMessages($conversation)->count())->toBe(0);
    expect($conversation->messages()->where('message_type', Message::TYPE_ACTIVITY)->value('content'))
        ->toBe(__('conversations.activity.csat.not_sent_due_to_messaging_window'));
});
