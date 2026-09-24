<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Label;
use App\Models\Message;
use App\Models\User;
use Illuminate\Support\Facades\App;

// Tin hoạt động lưu một lần cho cả account cùng đọc: phải theo ngôn ngữ của
// account, không theo ngôn ngữ giao diện của người đang thao tác.

function activityLocaleSetup(string $accountLocale): array
{
    $account = Account::factory()->create(['locale' => $accountLocale]);
    $conversation = Conversation::factory()->create(['account_id' => $account->id]);
    $operator = User::factory()->create(['name' => 'Lan']);
    $assignee = User::factory()->create(['name' => 'Minh']);

    foreach ([$operator, $assignee] as $user) {
        AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id]);
        $conversation->inbox->inboxMembers()->create(['user_id' => $user->id]);
    }

    Label::factory()->create(['account_id' => $account->id, 'title' => 'khach-vip']);

    return [$conversation, $operator, $assignee];
}

function activityContentsInOrder(Conversation $conversation): array
{
    return $conversation->messages()
        ->where('message_type', Message::TYPE_ACTIVITY)
        ->reorder('id')
        ->pluck('content')
        ->all();
}

it('dựng tin hoạt động tiếng Việt cho account vi khi người thao tác dùng giao diện tiếng Anh', function () {
    [$conversation, $operator, $assignee] = activityLocaleSetup('vi');
    $this->actingAs($operator);
    App::setLocale('en');

    $conversation->updateLabels(['khach-vip']);
    $conversation->update(['assignee_id' => $assignee->id]);
    $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

    $contents = activityContentsInOrder($conversation);

    expect($contents)->toContain('Lan thêm khach-vip')
        ->and($contents)->toContain('Chỉ định Minh bởi Lan')
        ->and(collect($contents)->filter(fn ($content) => str_contains($content, 'by Lan') || str_contains($content, 'added')))->toBeEmpty()
        ->and(App::getLocale())->toBe('en');
});

it('dựng tin hoạt động tiếng Anh cho account en khi người thao tác dùng giao diện tiếng Việt', function () {
    [$conversation, $operator, $assignee] = activityLocaleSetup('en');
    $this->actingAs($operator);
    App::setLocale('vi');

    $conversation->updateLabels(['khach-vip']);
    $conversation->update(['assignee_id' => $assignee->id]);

    expect(activityContentsInOrder($conversation))->toBe([
        'Lan added khach-vip',
        'Assigned to Minh by Lan',
    ])->and(App::getLocale())->toBe('vi');
});
