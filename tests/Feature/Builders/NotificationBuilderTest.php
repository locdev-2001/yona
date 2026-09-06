<?php

use App\Builders\NotificationBuilder;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\NotificationSetting;
use App\Models\User;

// Port từ spec/builders/notification_builder_spec.rb.

function subscribeUserToType(Account $account, User $user, string $notificationType): NotificationSetting
{
    $setting = NotificationSetting::query()->firstOrNew(['account_id' => $account->id, 'user_id' => $user->id]);
    $setting->setSelectedFlags('email', ["email_$notificationType"]);
    $setting->setSelectedFlags('push', ["push_$notificationType"]);
    $setting->save();

    return $setting;
}

function performNotificationBuild(string $notificationType, User $user, Account $account, Conversation $conversation)
{
    return (new NotificationBuilder($notificationType, $user, $account, $conversation))->perform();
}

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->user->id]);
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->inbox->addMembers([$this->user->id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
    ]);

    subscribeUserToType($this->account, $this->user, 'conversation_creation');
});

it('creates a notification', function () {
    performNotificationBuild('conversation_creation', $this->user, $this->account, $this->conversation);

    expect($this->user->notifications()->count())->toBe(1);
});

it('does nothing when the user has no notification setting', function () {
    NotificationSetting::query()->where('user_id', $this->user->id)->delete();

    expect(performNotificationBuild('conversation_creation', $this->user, $this->account, $this->conversation))->toBeNull();
});

it('skips conversation_creation when the user is not subscribed to it', function () {
    $setting = NotificationSetting::query()->where('user_id', $this->user->id)->first();
    $setting->setSelectedFlags('email', []);
    $setting->setSelectedFlags('push', []);
    $setting->save();

    expect(performNotificationBuild('conversation_creation', $this->user, $this->account, $this->conversation))->toBeNull();
});

it('still creates a mention notification when the user is not subscribed', function () {
    $setting = NotificationSetting::query()->where('user_id', $this->user->id)->first();
    $setting->setSelectedFlags('email', []);
    $setting->setSelectedFlags('push', []);
    $setting->save();

    performNotificationBuild('conversation_mention', $this->user, $this->account, $this->conversation);

    expect($this->user->notifications()->count())->toBe(1);
});

it('does not notify about a blocked contact except for mentions', function () {
    $this->conversation->contact->update(['blocked' => true]);
    $this->conversation->refresh();

    performNotificationBuild('conversation_creation', $this->user, $this->account, $this->conversation);

    expect($this->user->notifications()->count())->toBe(0);

    performNotificationBuild('conversation_mention', $this->user, $this->account, $this->conversation);

    expect($this->user->notifications()->count())->toBe(1);
});

it('does not notify an agent without inbox or team access', function () {
    $outsider = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $outsider->id]);
    subscribeUserToType($this->account, $outsider, 'conversation_creation');

    performNotificationBuild('conversation_creation', $outsider, $this->account, $this->conversation);

    expect($outsider->notifications()->count())->toBe(0);
});

it('notifies an administrator regardless of inbox membership', function () {
    $admin = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $this->account->id,
        'user_id' => $admin->id,
        'role' => AccountUser::ROLE_ADMINISTRATOR,
    ]);
    subscribeUserToType($this->account, $admin, 'conversation_creation');

    performNotificationBuild('conversation_creation', $admin, $this->account, $this->conversation);

    expect($admin->notifications()->count())->toBe(1);
});

it('does not notify a user outside the account', function () {
    $stranger = User::factory()->create();

    performNotificationBuild('conversation_mention', $stranger, $this->account, $this->conversation);

    expect($stranger->notifications()->count())->toBe(0);
});

it('notifies an agent whose team holds the conversation', function () {
    $teamAgent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $teamAgent->id]);
    subscribeUserToType($this->account, $teamAgent, 'conversation_creation');

    $team = $this->account->teams()->create(['name' => 'Support']);
    $team->teamMembers()->create(['user_id' => $teamAgent->id]);
    $this->conversation->update(['team_id' => $team->id]);

    performNotificationBuild('conversation_creation', $teamAgent, $this->account, $this->conversation);

    expect($teamAgent->notifications()->count())->toBe(1);
});
