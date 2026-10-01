<?php

use App\Models\Account;
use App\Models\Conversation;
use App\Models\User;
use App\Support\SharedModels;
use Illuminate\Foundation\Http\Events\RequestHandled;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Tests\Support\QueryCounter;

beforeEach(function () {
    $this->account = Account::factory()->create(['name' => 'Shop cũ']);
    $this->assignee = User::factory()->create();
    $this->conversations = Conversation::factory()->count(3)->create([
        'account_id' => $this->account->id,
        'assignee_id' => $this->assignee->id,
    ]);
    app(SharedModels::class)->flush();
});

function freshConversations(): array
{
    return Conversation::query()->orderBy('id')->get()->all();
}

it('nạp account và người được gán một lần cho mọi hội thoại cùng account', function () {
    $conversations = freshConversations();

    $queries = QueryCounter::measure(function () use ($conversations) {
        foreach ($conversations as $conversation) {
            $conversation->account;
            $conversation->assignee;
            $conversation->contact->account;
        }
    });

    expect($conversations[0]->account)->toBe($conversations[2]->account)
        ->and($conversations[0]->assignee)->toBe($conversations[2]->assignee)
        ->and($conversations[0]->contact->account)->toBe($conversations[0]->account)
        // 1 account + 1 user + 3 contact (mỗi hội thoại một khách); trước đây 12.
        ->and($queries->count())->toBe(5);
});

it('instance khác của account được lưu thì lần nạp sau đọc bản mới', function () {
    expect(freshConversations()[0]->account->name)->toBe('Shop cũ');

    Account::query()->find($this->account->id)->update(['name' => 'Shop mới']);

    expect(freshConversations()[0]->account->name)->toBe('Shop mới');
});

it('xoá bản dùng chung khi request kết thúc', function () {
    $before = freshConversations()[0]->account;

    event(new RequestHandled(Request::create('/'), new Response));

    expect(freshConversations()[0]->account)->not->toBe($before);
});

it('không dùng chung khi khoá ngoại rỗng hoặc quan hệ không phải account/contact/user', function () {
    $conversation = freshConversations()[0];
    $conversation->assignee_id = null;

    expect($conversation->assignee)->toBeNull()
        ->and($conversation->inbox)->not->toBeNull();
});
