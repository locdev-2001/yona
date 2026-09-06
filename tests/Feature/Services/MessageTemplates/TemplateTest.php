<?php

use App\Models\Conversation;
use App\Models\Message;
use App\Services\MessageTemplates\Template\AutoResolve;
use App\Services\MessageTemplates\Template\CsatSurvey;
use App\Services\MessageTemplates\Template\EmailCollect;
use App\Services\MessageTemplates\Template\Greeting;
use App\Services\MessageTemplates\Template\OutOfOffice;

// Port từ spec/services/message_templates/template/{email_collect,greeting,csat_survey,out_of_office,auto_resolve}_spec.rb.

it('creates the two email collect messages', function () {
    $conversation = Conversation::factory()->create();

    (new EmailCollect($conversation))->perform();

    $messages = $conversation->messages()->reorder('id')->get();

    expect($messages)->toHaveCount(2);
    expect($messages->pluck('message_type')->all())->toBe([Message::TYPE_TEMPLATE, Message::TYPE_TEMPLATE]);
    expect($messages->last()->content_type)->toBe(Message::CONTENT_TYPES['input_email']);
});

it('writes template messages in the account locale, not the request locale', function () {
    $conversation = Conversation::factory()->create();
    $conversation->account->update(['locale' => 'vi']);
    app()->setLocale('en');

    (new EmailCollect($conversation->fresh()))->perform();

    $messages = $conversation->messages()->reorder('id')->get();

    expect($messages->first()->content)->toBe(__('conversations.templates.ways_to_reach_you_message_body', [], 'vi'));
    expect($messages->last()->content)->toBe(__('conversations.templates.email_input_box_message_body', [], 'vi'));
    // Locale của request được trả lại nguyên trạng sau khi sinh tin.
    expect(app()->getLocale())->toBe('en');
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

it('creates the out of office message', function () {
    $conversation = Conversation::factory()->create();
    $conversation->inbox->update(['out_of_office_message' => 'We are away right now.']);

    (new OutOfOffice($conversation))->perform();

    $message = $conversation->messages()->sole();

    expect($message->message_type)->toBe(Message::TYPE_TEMPLATE)
        ->and($message->content)->toBe('We are away right now.');
});

it('renders template variables in the out of office message', function () {
    $conversation = Conversation::factory()->create();
    $conversation->contact->update(['name' => 'Trang Nguyen']);
    $conversation->inbox->update([
        'out_of_office_message' => 'Hey, {{contact.name}} we are unavailable at the moment. - from {{account.name}}',
    ]);

    (new OutOfOffice($conversation))->perform();

    expect($conversation->messages()->sole()->content)
        ->toBe("Hey, Trang Nguyen we are unavailable at the moment. - from {$conversation->account->name}");
});

it('creates the auto resolve message from the account settings', function () {
    $conversation = Conversation::factory()->create();
    $conversation->account->update(['settings' => ['auto_resolve_message' => 'Closing this for now.']]);

    (new AutoResolve($conversation->fresh()))->perform();

    $message = $conversation->messages()->sole();

    expect($message->message_type)->toBe(Message::TYPE_TEMPLATE)
        ->and($message->content)->toBe('Closing this for now.');
});

it('logs an activity instead of a message outside the reply window', function () {
    $conversation = Conversation::factory()->create();
    $conversation->account->update(['settings' => ['auto_resolve_message' => 'Closing this for now.']]);
    $conversation->inbox->channel->update(['additional_attributes' => ['agent_reply_time_window' => '12']]);

    (new AutoResolve($conversation->fresh()))->perform();

    $message = $conversation->messages()->sole();

    expect($message->message_type)->toBe(Message::TYPE_ACTIVITY)
        ->and($message->content)->toBe('Auto-resolve message not sent due to outgoing message restrictions');
});

it('creates no auto resolve message when the account has none', function () {
    $conversation = Conversation::factory()->create();

    (new AutoResolve($conversation))->perform();

    expect($conversation->messages()->count())->toBe(0);
});
