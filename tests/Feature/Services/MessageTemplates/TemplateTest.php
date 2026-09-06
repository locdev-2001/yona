<?php

use App\Models\Conversation;
use App\Models\Message;
use App\Services\MessageTemplates\Template\EmailCollect;
use App\Services\MessageTemplates\Template\Greeting;

// Port từ spec/services/message_templates/template/{email_collect,greeting}_spec.rb.

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
