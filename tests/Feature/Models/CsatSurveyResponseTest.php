<?php

use App\Exceptions\RecordInvalidException;
use App\Models\CsatSurveyResponse;

// Port từ spec/models/csat_survey_response_spec.rb.

it('creates a valid csat survey response from the factory', function () {
    $response = CsatSurveyResponse::factory()->create();

    expect($response->exists)->toBeTrue();
    expect($response->account_id)->not->toBeNull();
    expect($response->conversation_id)->not->toBeNull();
    expect($response->contact_id)->not->toBeNull();
    expect($response->message_id)->not->toBeNull();
});

it('rejects a rating outside the 1..5 range', function (mixed $rating) {
    expect(fn () => CsatSurveyResponse::factory()->create(['rating' => $rating]))
        ->toThrow(RecordInvalidException::class, 'Rating is not included in the list');
})->with([6, 0, -1, null]);

it('rejects a response without its owning records', function (string $attribute) {
    $response = CsatSurveyResponse::factory()->create();
    $response->setAttribute($attribute, null);

    expect(fn () => $response->save())->toThrow(RecordInvalidException::class);
})->with(['account_id', 'conversation_id', 'contact_id']);

it('belongs to the account, conversation, contact, message and assigned agent', function () {
    $response = CsatSurveyResponse::factory()->create();

    expect($response->account->id)->toBe($response->account_id);
    expect($response->conversation->id)->toBe($response->conversation_id);
    expect($response->contact->id)->toBe($response->contact_id);
    expect($response->message->id)->toBe($response->message_id);
    expect($response->assignedAgent)->toBeNull();
});
