<?php

use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\CsatSurveyResponse;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use Carbon\Carbon;

// Port từ spec/controllers/api/v1/accounts/csat_survey_responses_controller_spec.rb.
beforeEach(function () {
    $this->inbox = Inbox::factory()->create();
    $this->account = $this->inbox->account;

    $this->admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $this->account->id, 'user_id' => $this->admin->id]);

    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);

    $this->url = "/api/v1/accounts/{$this->account->id}/csat_survey_responses";
});

afterEach(fn () => Carbon::setTestNow());

function d2CsatResponse(int $rating, array $overrides = []): CsatSurveyResponse
{
    $contact = Contact::factory()->create(['account_id' => test()->account->id]);
    $conversation = Conversation::factory()->create([
        'account_id' => test()->account->id,
        'inbox_id' => test()->inbox->id,
        'contact_id' => $contact->id,
    ]);

    $message = Message::factory()->create([
        'account_id' => test()->account->id,
        'conversation_id' => $conversation->id,
        'inbox_id' => test()->inbox->id,
        'content_type' => Message::CONTENT_TYPES['input_csat'],
    ]);

    return CsatSurveyResponse::create(array_replace([
        'account_id' => test()->account->id,
        'conversation_id' => $conversation->id,
        'message_id' => $message->id,
        'contact_id' => $contact->id,
        'assigned_agent_id' => test()->agent->id,
        'rating' => $rating,
        'feedback_message' => 'ok',
    ], $overrides));
}

it('rejects agents', function () {
    $this->actingAs($this->agent)->getJson($this->url)->assertUnauthorized();
});

it('lists the responses of the account', function () {
    $response = d2CsatResponse(4);

    $payload = $this->actingAs($this->admin)->getJson($this->url)->assertOk()->json();

    expect($payload)->toHaveCount(1)
        ->and($payload[0]['id'])->toBe($response->id)
        ->and($payload[0]['rating'])->toBe(4)
        ->and($payload[0]['conversation_id'])->toBe($response->conversation->display_id)
        ->and($payload[0]['assigned_agent']['id'])->toBe($this->agent->id);
});

it('filters the responses by rating', function () {
    d2CsatResponse(4);
    d2CsatResponse(2);

    $payload = $this->actingAs($this->admin)->getJson($this->url.'?rating=2')->assertOk()->json();

    expect($payload)->toHaveCount(1)->and($payload[0]['rating'])->toBe(2);
});

it('reports the rating distribution and the number of surveys sent', function () {
    d2CsatResponse(5);
    d2CsatResponse(5);
    d2CsatResponse(3);

    $payload = $this->actingAs($this->admin)->getJson($this->url.'/metrics')->assertOk()->json();

    expect($payload['total_count'])->toBe(3)
        ->and($payload['ratings_count'])->toBe(['3' => 1, '5' => 2])
        ->and($payload['total_sent_messages_count'])->toBe(3);
});

it('downloads the responses as csv', function () {
    d2CsatResponse(4);

    $response = $this->actingAs($this->admin)->get($this->url.'/download')->assertOk();

    expect($response->headers->get('content-type'))->toContain('text/csv');
    expect($response->streamedContent())->toContain($this->agent->email);
});
