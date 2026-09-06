<?php

use App\Models\Conversation;
use App\Models\CsatSurveyResponse;
use App\Models\Inbox;
use App\Models\Message;

// Port từ spec/listeners/csat_survey_listener_spec.rb. Bản gốc mock service và
// builder; ở đây listener chạy đồng bộ nên kiểm chính kết quả quan sát được.

function csatListenerConversation(bool $csatEnabled = true): Conversation
{
    $inbox = Inbox::factory()->create(['csat_survey_enabled' => $csatEnabled]);

    return Conversation::factory()->create(['account_id' => $inbox->account_id, 'inbox_id' => $inbox->id]);
}

it('sends the survey when a conversation becomes resolved', function () {
    $conversation = csatListenerConversation();

    $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

    expect($conversation->messages()->where('content_type', Message::CONTENT_TYPES['input_csat'])->count())->toBe(1);
});

it('does not send the survey when the conversation moves to another status', function () {
    $conversation = csatListenerConversation();

    $conversation->update(['status' => Conversation::STATUS_PENDING]);

    expect($conversation->messages()->where('content_type', Message::CONTENT_TYPES['input_csat'])->count())->toBe(0);
});

it('builds the response when a csat message is updated', function () {
    $message = Message::factory()->create(['content_type' => Message::CONTENT_TYPES['input_csat']]);

    $message->update([
        'content_attributes' => ['submitted_values' => ['csat_survey_response' => ['rating' => 4, 'feedback_message' => 'good']]],
    ]);

    $response = CsatSurveyResponse::sole();
    expect($response->rating)->toBe(4);
    expect($response->message_id)->toBe($message->id);
});

it('ignores updates on messages that are not csat surveys', function () {
    $message = Message::factory()->create();

    $message->update(['content' => 'edited']);

    expect(CsatSurveyResponse::count())->toBe(0);
});

it('swallows a rating the visitor tampered with', function () {
    $message = Message::factory()->create(['content_type' => Message::CONTENT_TYPES['input_csat']]);

    $message->update([
        'content_attributes' => ['submitted_values' => ['csat_survey_response' => ['rating' => 42]]],
    ]);

    expect(CsatSurveyResponse::count())->toBe(0);
});
