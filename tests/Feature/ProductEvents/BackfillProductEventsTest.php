<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Article;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Label;
use App\Models\Message;
use App\Models\ProductEvent;
use App\Models\User;

// product-events:backfill dựng sự kiện từ dữ liệu cũ, chạy lại không nhân đôi và
// không trùng với sự kiện đã ghi lúc chạy thật (cùng khoá chống trùng).

beforeEach(function () {
    $this->account = Account::factory()->create(['created_at' => now()->subDays(40)]);
    $this->owner = User::factory()->create(['confirmed_at' => now()->subDays(39)]);
    AccountUser::factory()->administrator()->create(['account_id' => $this->account->id, 'user_id' => $this->owner->id]);
    $this->inbox = Inbox::factory()->webWidget()->create(['account_id' => $this->account->id, 'created_at' => now()->subDays(38)]);
    $this->telegram = Inbox::factory()->telegram()->create(['account_id' => $this->account->id]);
    $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id]);
    $base = ['account_id' => $this->account->id, 'inbox_id' => $this->inbox->id, 'conversation_id' => $conversation->id];
    $this->firstIncoming = Message::factory()->create([...$base, 'created_at' => now()->subDays(30)]);
    Message::factory()->create([...$base, 'created_at' => now()->subDays(20)]);
    Message::factory()->outgoing()->create([...$base, 'sender_type' => 'User', 'sender_id' => $this->owner->id, 'created_at' => now()->subDays(29)]);
    Message::factory()->outgoing()->create([...$base, 'sender_type' => 'User', 'sender_id' => $this->owner->id, 'content_type' => Message::CONTENT_TYPES['sticker'], 'content_attributes' => ['sticker' => ['id' => 'yona:3']]]);
    Label::factory()->create(['account_id' => $this->account->id]);
    Article::factory()->create(['account_id' => $this->account->id]);

    // Xoá sự kiện hook vừa ghi lúc dựng dữ liệu: giả lập dữ liệu có từ trước khi có bảng.
    ProductEvent::query()->delete();
});

it('dựng sự kiện từ bảng gốc với mốc thời gian gốc', function () {
    $this->artisan('product-events:backfill')->assertSuccessful();

    $byName = ProductEvent::query()->get()->groupBy('name');

    expect($byName->keys()->sort()->values()->all())->toBe([
        'account_signed_up', 'channel_connected', 'email_confirmed', 'first_inbound_message', 'first_outbound_reply',
        'help_center_article_published', 'inbox_created', 'label_created', 'sticker_sent',
    ])
        ->and($byName['account_signed_up'][0]->user_id)->toBe($this->owner->id)
        ->and($byName['account_signed_up'][0]->occurred_at->toDateString())->toBe($this->account->created_at->toDateString())
        ->and($byName['email_confirmed'][0]->occurred_at->toDateString())->toBe($this->owner->confirmed_at->toDateString())
        ->and($byName['inbox_created'])->toHaveCount(2)
        ->and($byName['first_inbound_message'])->toHaveCount(1)
        ->and($byName['first_inbound_message'][0]->occurred_at->toDateString())->toBe($this->firstIncoming->created_at->toDateString())
        ->and($byName['first_inbound_message'][0]->properties)->toEqualCanonicalizing(['inbox_id' => $this->inbox->id, 'platform' => 'website', 'backfilled' => true])
        ->and($byName['first_outbound_reply'][0]->user_id)->toBe($this->owner->id)
        ->and($byName['sticker_sent'][0]->properties['source'])->toBe('yona')
        ->and($byName['channel_connected']->map(fn ($event) => $event->properties['method'].':'.$event->properties['inbox_id'])->sort()->values()->all())
        ->toBe(['token:'.$this->telegram->id, 'widget_embed:'.$this->inbox->id]);
});

it('chạy lại không thêm dòng nào', function () {
    $this->artisan('product-events:backfill')->assertSuccessful();
    $count = ProductEvent::query()->count();

    $this->artisan('product-events:backfill')->expectsOutputToContain('Tổng thêm mới: 0')->assertSuccessful();

    expect(ProductEvent::query()->count())->toBe($count);
});

it('không trùng với sự kiện đã ghi lúc chạy thật', function () {
    // Hook ghi thật cho nhãn mới, rồi dựng lại từ đầu.
    $label = Label::factory()->create(['account_id' => $this->account->id]);
    expect(ProductEvent::query()->where('dedupe_key', "label_created:{$label->id}")->count())->toBe(1);

    $this->artisan('product-events:backfill')->assertSuccessful();

    expect(ProductEvent::query()->where('name', 'label_created')->count())->toBe(2)
        ->and(ProductEvent::query()->where('dedupe_key', "label_created:{$label->id}")->count())->toBe(1);
});

it('chỉ dựng cho một account khi truyền --account', function () {
    $other = Account::factory()->create();
    ProductEvent::query()->delete();

    $this->artisan('product-events:backfill', ['--account' => $this->account->id])->assertSuccessful();

    expect(ProductEvent::query()->distinct()->pluck('account_id')->all())->toBe([$this->account->id])
        ->and(ProductEvent::query()->where('account_id', $other->id)->exists())->toBeFalse();

    $this->artisan('product-events:backfill', ['--account' => 'abc'])->assertFailed();
});
