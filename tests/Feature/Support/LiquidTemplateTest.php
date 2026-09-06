<?php

use App\Models\Conversation;
use App\Models\Message;
use App\Support\LiquidTemplate;
use App\Support\MessageDrops;

// Thay `Liquid::Template.parse(...).render(drops)` của Liquidable + app/drops/*.rb.

it('replaces known variables and blanks out unknown ones', function (string $template, string $expected) {
    expect(LiquidTemplate::render($template, ['contact' => ['name' => 'Trang', 'custom_attribute' => ['plan' => 'pro']]]))
        ->toBe($expected);
})->with([
    'plain' => ['Hi {{contact.name}}!', 'Hi Trang!'],
    'with spaces' => ['Hi {{ contact.name }}!', 'Hi Trang!'],
    'nested custom attribute' => ['Plan: {{contact.custom_attribute.plan}}', 'Plan: pro'],
    'unknown variable' => ['Hi {{contact.nickname}}!', 'Hi !'],
    'unknown root' => ['Hi {{agent.name}}!', 'Hi !'],
    'no variable' => ['Hi there', 'Hi there'],
    'code block is left alone' => ['Run `{{contact.name}}` now', 'Run `{{contact.name}}` now'],
]);

it('capitalizes names the way the Ruby drops do', function () {
    $conversation = Conversation::factory()->create();
    $conversation->contact->update(['name' => 'trang nGUYEN', 'email' => 'trang@test.com']);

    $drops = MessageDrops::forMessage(Message::factory()->make([
        'conversation_id' => $conversation->id,
        'message_type' => Message::TYPE_TEMPLATE,
    ]));

    expect($drops['contact'])->toMatchArray([
        'name' => 'Trang Nguyen',
        'first_name' => 'Trang',
        'last_name' => 'Nguyen',
        'email' => 'trang@test.com',
    ]);
    expect($drops['conversation']['contact_name'])->toBe('Trang nguyen');
    expect($drops['account']['name'])->toBe($conversation->account->name);
});

it('falls back to Customer when the contact has no name', function () {
    $conversation = Conversation::factory()->create();
    $conversation->contact->update(['name' => '']);

    $drops = MessageDrops::forMessage(Message::factory()->make([
        'conversation_id' => $conversation->id,
        'message_type' => Message::TYPE_TEMPLATE,
    ]));

    expect($drops['conversation']['contact_name'])->toBe('Customer');
    expect($drops['contact']['last_name'])->toBeNull();
});

it('leaves visitor messages untouched', function () {
    $conversation = Conversation::factory()->create();

    $message = Message::factory()->create([
        'account_id' => $conversation->account_id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'message_type' => Message::TYPE_INCOMING,
        'content' => 'Hi {{contact.name}}',
    ]);

    expect($message->content)->toBe('Hi {{contact.name}}');
});
