<?php

use App\Models\Conversation;
use App\Models\Message;
use App\Services\MessageTemplates\Template\CsatSurvey;
use App\Services\MessageTemplates\Template\EmailCollect;
use App\Services\MessageTemplates\Template\Greeting;

// Port từ spec/services/message_templates/template/{email_collect,greeting,csat_survey}_spec.rb.

it('creates the two email collect messages', function () {
    $conversation = Conversation::factory()->create();

    (new EmailCollect($conversation))->perform();

    $messages = $conversation->messages()->reorder('id')->get();

    expect($messages)->toHaveCount(2);
    expect($messages->pluck('message_type')->all())->toBe([Message::TYPE_TEMPLATE, Message::TYPE_TEMPLATE]);
    expect($messages->last()->content_type)->toBe(Message::CONTENT_TYPES['input_email']);
});

it('creates the greeting message', function () {
    $conversation = Conversation::factory()->create();
    $conversation->inbox->update(['greeting_message' => 'Hello welcome to our board.']);

    (new Greeting($conversation))->perform();

    expect($conversation->messages()->count())->toBe(1);
    expect($conversation->messages()->first()->content)->toBe('Hello welcome to our board.');
});

it('renders template variables in the greeting message', function (string $greeting, callable $expected) {
    $conversation = Conversation::factory()->create();
    $conversation->contact->update(['name' => 'Trang Nguyen']);
    $conversation->inbox->update(['greeting_message' => $greeting]);

    (new Greeting($conversation))->perform();

    expect($conversation->messages()->first()->content)->toBe($expected($conversation->fresh()));
})->with([
    'one variable' => [
        'Hey, {{contact.name}} welcome to our board.',
        fn (Conversation $conversation) => "Hey, {$conversation->contact->name} welcome to our board.",
    ],
    'two variables' => [
        'Hey, {{contact.name}} welcome to our board. - from {{account.name}}',
        fn (Conversation $conversation) => "Hey, {$conversation->contact->name} welcome to our board. - from {$conversation->account->name}",
    ],
]);

it('creates a csat survey message with the default copy', function () {
    $conversation = Conversation::factory()->create();
    $conversation->inbox->update(['csat_config' => []]);

    (new CsatSurvey($conversation))->perform();

    $message = $conversation->messages()->sole();

    expect($message->message_type)->toBe(Message::TYPE_TEMPLATE);
    expect($message->content_type)->toBe(Message::CONTENT_TYPES['input_csat']);
    expect($message->content)->toBe(__('conversations.templates.csat_input_message_body'));
    expect($message->content_attributes['display_type'])->toBe('emoji');
});

it('creates a csat survey message from the inbox configuration', function () {
    $conversation = Conversation::factory()->create();
    $conversation->inbox->update(['csat_config' => ['display_type' => 'star', 'message' => 'Please rate your experience']]);

    (new CsatSurvey($conversation->fresh()))->perform();

    $message = $conversation->messages()->sole();

    expect($message->content)->toBe('Please rate your experience');
    expect($message->content_attributes['display_type'])->toBe('star');
});
