<?php

use App\Models\Conversation;
use App\Models\CsatSurveyResponse;
use App\Models\Message;

// Port từ spec/controllers/public/api/v1/csat_survey_controller_spec.rb.

$submission = ['message' => ['submitted_values' => ['csat_survey_response' => [
    'rating' => 4,
    'feedback_message' => 'amazing experience',
]]]];

function surveyConversation(array $messageAttributes = []): Conversation
{
    $conversation = Conversation::factory()->create();
    Message::factory()->create([
        'account_id' => $conversation->account_id,
        'conversation_id' => $conversation->id,
        'content_type' => Message::CONTENT_TYPES['input_csat'],
        ...$messageAttributes,
    ]);

    return $conversation;
}

it('returns the csat survey of the conversation', function () {
    $conversation = surveyConversation();

    $response = $this->getJson("/public/api/v1/csat_survey/{$conversation->uuid}");

    $response->assertOk();
    expect($response->json('conversation_id'))->toBe($conversation->id);
    expect($response->json('display_type'))->toBe('emoji');
    expect($response->json('inbox_name'))->toBe($conversation->inbox->name);
    expect($response->json('csat_survey_response'))->toBeNull();
});

it('returns not found when the conversation has no survey message', function () {
    $conversation = Conversation::factory()->create();
    Message::factory()->create(['account_id' => $conversation->account_id, 'conversation_id' => $conversation->id]);

    $this->getJson("/public/api/v1/csat_survey/{$conversation->uuid}")->assertNotFound();
});

it('returns not found for an unknown conversation', function () {
    $this->getJson('/public/api/v1/csat_survey/'.Str::uuid()->toString())->assertNotFound();
    $this->getJson('/public/api/v1/csat_survey/not-a-uuid')->assertNotFound();
});

it('records the rating and feedback of the conversation', function () use ($submission) {
    $conversation = surveyConversation();

    $response = $this->patchJson("/public/api/v1/csat_survey/{$conversation->uuid}", $submission);

    $response->assertOk();
    expect($response->json('conversation_id'))->toBe($conversation->id);
    expect($response->json('csat_survey_response.conversation_id'))->toBe($conversation->id);
    expect($response->json('csat_survey_response.rating'))->toBe(4);
    expect($response->json('csat_survey_response.feedback_message'))->toBe('amazing experience');
    expect(CsatSurveyResponse::count())->toBe(1);
});

it('rejects an update after 14 days', function () use ($submission) {
    $conversation = surveyConversation(['created_at' => now()->subDays(15)]);

    $response = $this->patchJson("/public/api/v1/csat_survey/{$conversation->uuid}", $submission);

    $response->assertStatus(422);
    expect($response->json('error'))->toBe('You cannot update the CSAT survey after 14 days');
    expect(CsatSurveyResponse::count())->toBe(0);
});

it('keeps only the permitted keys of submitted_values', function () {
    $conversation = surveyConversation();

    $this->patchJson("/public/api/v1/csat_survey/{$conversation->uuid}", ['message' => ['submitted_values' => [
        'csat_survey_response' => ['rating' => 5, 'feedback_message' => 'ok', 'account_id' => 99],
        'injected' => 'nope',
    ]]])->assertOk();

    $submitted = $conversation->messages()->sole()->content_attributes['submitted_values'];

    expect($submitted)->toBe(['csat_survey_response' => ['rating' => 5, 'feedback_message' => 'ok']]);
});
