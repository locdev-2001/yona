<?php

use App\Builders\CsatSurveys\ResponseBuilder;
use App\Models\CsatSurveyResponse;
use App\Models\Message;

// Port từ spec/builders/csat_surveys/response_builder_spec.rb.

function csatSurveyMessage(array $submittedValues = ['rating' => 5, 'feedback_message' => 'hello']): Message
{
    return Message::factory()->create([
        'content_type' => Message::CONTENT_TYPES['input_csat'],
        'content_attributes' => ['submitted_values' => ['csat_survey_response' => $submittedValues]],
    ]);
}

it('creates a new csat survey response', function () {
    $message = csatSurveyMessage();

    $response = (new ResponseBuilder($message))->perform();

    expect($response->rating)->toBe(5);
    expect($response->feedback_message)->toBe('hello');
    expect($response->conversation_id)->toBe($message->conversation_id);
    expect($response->contact_id)->toBe($message->conversation->contact_id);
});

it('updates the existing response instead of creating a second one', function () {
    $message = csatSurveyMessage();
    $existing = CsatSurveyResponse::factory()->create([
        'account_id' => $message->account_id,
        'message_id' => $message->id,
        'rating' => 1,
    ]);

    $response = (new ResponseBuilder($message->fresh()))->perform();

    expect($response->id)->toBe($existing->id);
    expect($response->rating)->toBe(5);
    expect(CsatSurveyResponse::count())->toBe(1);
});

it('does nothing without a rating', function () {
    $response = (new ResponseBuilder(csatSurveyMessage(['feedback_message' => 'hello'])))->perform();

    expect($response)->toBeNull();
    expect(CsatSurveyResponse::count())->toBe(0);
});

it('refuses a message that is not a csat survey', function () {
    expect(fn () => (new ResponseBuilder(Message::factory()->create()))->perform())
        ->toThrow(RuntimeException::class, 'Invalid Message');
});
