<?php

use App\Finders\ConversationFinder;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Message;
use App\Models\User;
use App\Services\Conversations\ListSearchService;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->admin = User::factory()->create();
    AccountUser::factory()->create([
        'account_id' => $this->account->id,
        'user_id' => $this->admin->id,
        'role' => AccountUser::ROLE_ADMINISTRATOR,
    ]);
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->inbox->addMembers([$this->agent->id]);
    $this->restrictedInbox = Inbox::factory()->create(['account_id' => $this->account->id]);

    $this->conversationOf = function (array $contactAttributes, array $conversationAttributes = [], ?Contact $contact = null): Conversation {
        $contact ??= Contact::factory()->create([
            'account_id' => $this->account->id,
            'email' => null,
            'phone_number' => null,
            'identifier' => null,
            ...$contactAttributes,
        ]);

        return Conversation::factory()->create([
            'account_id' => $this->account->id,
            'inbox_id' => $this->inbox->id,
            'contact_id' => $contact->id,
            ...$conversationAttributes,
        ]);
    };

    $this->messageIn = fn (Conversation $conversation, string $content, mixed $createdAt = null): Message => Message::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $conversation->inbox_id,
        'conversation_id' => $conversation->id,
        'content' => $content,
        'created_at' => $createdAt ?? now(),
    ]);

    $this->search = function (string $query, ?User $user = null): array {
        return $this->actingAs($user ?? $this->admin)
            ->getJson("/api/v1/accounts/{$this->account->id}/conversations/search?status=all&{$query}")
            ->assertOk()
            ->json('data');
    };
});

it('chia kết quả thành liên hệ khớp tên và hội thoại có tin khớp, tìm không dấu', function () {
    $byName = ($this->conversationOf)(['name' => 'Sếu đầu đỏ ẩn danh'], ['last_activity_at' => now()->subDay()]);
    $byMessage = ($this->conversationOf)(['name' => 'Khách quen']);
    ($this->messageIn)($byMessage, 'Em muốn nhận thông báo qua email', now()->subMinutes(5));
    ($this->messageIn)($byMessage, 'Cảm ơn shop', now());
    $both = ($this->conversationOf)(['name' => 'Ẩn Danh'], ['last_activity_at' => now()]);
    ($this->messageIn)($both, 'Nhận hàng rồi');
    ($this->conversationOf)(['name' => 'Không liên hệ']);

    $result = ($this->search)('q='.urlencode('Ạn'));

    expect(collect($result['contacts'])->pluck('id')->all())->toBe([$both->display_id, $byName->display_id])
        ->and(collect($result['conversations'])->pluck('id')->sort()->values()->all())
        ->toBe(collect([$byMessage->display_id, $both->display_id])->sort()->values()->all());

    $matched = collect($result['conversations'])->firstWhere('id', $byMessage->display_id)['matched_message'];
    expect($matched['content'])->toBe('Em muốn nhận thông báo qua email');
});

it('xếp liên hệ trùng khít trước đầu từ trước một phần, hoà thì hoạt động gần nhất trước, mỗi khách một dòng', function () {
    $inside = ($this->conversationOf)(['name' => 'Lanhan'], ['last_activity_at' => now()]);
    $leadingOld = ($this->conversationOf)(['name' => 'Hàn Mạc Tử'], ['last_activity_at' => now()->subDays(3)]);
    $leadingNew = ($this->conversationOf)(['name' => 'Ngọc Hân'], ['last_activity_at' => now()->subDay()]);
    $exact = ($this->conversationOf)(['name' => 'Hân'], ['last_activity_at' => now()->subDays(9)]);
    $exactNewer = ($this->conversationOf)([], ['last_activity_at' => now()->subDays(2)], $exact->contact);

    $contacts = collect(($this->search)('q=han')['contacts']);

    expect($contacts->pluck('id')->all())->toBe([$exactNewer->display_id, $leadingNew->display_id, $leadingOld->display_id, $inside->display_id]);
});

it('mục hội thoại xếp theo tin khớp mới nhất, tin trùng thời gian phá hoà theo id, có phân trang', function () {
    $sameTime = now()->subHour();
    $older = ($this->conversationOf)(['name' => 'A']);
    ($this->messageIn)($older, 'báo giá cũ', now()->subDays(2));
    $tieLow = ($this->conversationOf)(['name' => 'B']);
    ($this->messageIn)($tieLow, 'bao gia', $sameTime);
    $tieHigh = ($this->conversationOf)(['name' => 'C']);
    ($this->messageIn)($tieHigh, 'BÁO GIÁ', $sameTime);
    $latest = ($this->conversationOf)(['name' => 'D'], ['last_activity_at' => now()->subYear()]);
    $latestMatch = ($this->messageIn)($latest, 'gửi báo giá mới', now()->subMinute());
    ($this->messageIn)($latest, 'báo giá đầu tiên', now()->subDays(5));

    $result = ($this->search)('q='.urlencode('báo giá'));

    expect(collect($result['conversations'])->pluck('id')->all())->toBe([$latest->display_id, $tieHigh->display_id, $tieLow->display_id, $older->display_id])
        ->and($result['conversations'][0]['matched_message']['id'])->toBe($latestMatch->id)
        ->and($result['meta']['has_more'])->toBeFalse();

    foreach (range(1, ListSearchService::CONVERSATIONS_PER_PAGE) as $index) {
        ($this->messageIn)(($this->conversationOf)(['name' => "Khách {$index}"]), 'báo giá', now()->subDays(10));
    }

    $firstPage = ($this->search)('q='.urlencode('báo giá'));
    $secondPage = ($this->search)('q='.urlencode('báo giá').'&page=2');

    expect($firstPage['meta']['has_more'])->toBeTrue()
        ->and($firstPage['conversations'])->toHaveCount(ListSearchService::CONVERSATIONS_PER_PAGE)
        ->and($secondPage['contacts'])->toBe([])
        ->and(array_intersect(
            collect($firstPage['conversations'])->pluck('id')->all(),
            collect($secondPage['conversations'])->pluck('id')->all(),
        ))->toBe([])
        ->and(count($firstPage['conversations']) + count($secondPage['conversations']))->toBe(ListSearchService::CONVERSATIONS_PER_PAGE + 4);
});

it('gõ mã hội thoại thì hội thoại đó đứng đầu mục hội thoại', function () {
    $target = ($this->conversationOf)(['name' => 'Khách mã']);
    $other = ($this->conversationOf)(['name' => 'Khách khác']);
    ($this->messageIn)($other, "đơn #{$target->display_id} đã giao");

    $result = ($this->search)('q='.urlencode('#'.$target->display_id));

    expect(collect($result['conversations'])->pluck('id')->all())->toBe([$target->display_id, $other->display_id])
        ->and($result['conversations'][0]['matched_message'])->toBeNull();
});

it('tìm theo số điện thoại và email đưa vào mục liên hệ', function () {
    $byPhone = ($this->conversationOf)(['name' => 'Khách A', 'phone_number' => '+84901234567']);
    $byEmail = ($this->conversationOf)(['name' => 'Khách B', 'email' => 'shop.hoa@example.com']);

    expect(collect(($this->search)('q=0901234567')['contacts'])->pluck('id')->all())->toBe([])
        ->and(collect(($this->search)('q=901234567')['contacts'])->pluck('id')->all())->toBe([$byPhone->display_id])
        ->and(collect(($this->search)('q=shop.hoa')['contacts'])->pluck('id')->all())->toBe([$byEmail->display_id]);
});

it('giữ phạm vi danh sách đang xem: tab, trạng thái, hộp thư người xem được phép', function () {
    $mine = ($this->conversationOf)(['name' => 'Xoài của tôi'], ['assignee_id' => $this->agent->id]);
    ($this->messageIn)($mine, 'xoài cát');
    $unassigned = ($this->conversationOf)(['name' => 'Xoài chưa gán']);
    ($this->conversationOf)(['name' => 'Xoài đã xong'], ['assignee_id' => $this->agent->id, 'status' => Conversation::STATUS_RESOLVED]);
    $hidden = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->restrictedInbox->id,
        'contact_id' => Contact::factory()->create(['account_id' => $this->account->id, 'name' => 'Xoài bí mật'])->id,
    ]);
    ($this->messageIn)($hidden, 'xoài bí mật');

    $mineOpen = $this->actingAs($this->agent)
        ->getJson("/api/v1/accounts/{$this->account->id}/conversations/search?status=open&assignee_type=me&q=xoai")
        ->assertOk()
        ->json('data');
    $agentAll = ($this->search)('q=xoai', $this->agent);

    expect(collect($mineOpen['contacts'])->pluck('id')->all())->toBe([$mine->display_id])
        ->and(collect($mineOpen['conversations'])->pluck('id')->all())->toBe([$mine->display_id])
        ->and($mineOpen['meta']['mine_count'])->toBe(1)
        ->and($mineOpen['meta']['all_count'])->toBe(2)
        ->and(collect($agentAll['contacts'])->pluck('id'))->not->toContain($hidden->display_id)
        ->and(collect($agentAll['conversations'])->pluck('id'))->not->toContain($hidden->display_id)
        ->and(collect($agentAll['contacts'])->pluck('id'))->toContain($unassigned->display_id);
});

it('đường tìm chia mục ra đúng tập hội thoại của đường lọc cũ trên dữ liệu trộn', function () {
    $sameTime = now()->subHours(2);
    $conversations = [
        ($this->conversationOf)(['name' => 'Ẩn Danh']),
        ($this->conversationOf)(['name' => 'an danh']),
        ($this->conversationOf)(['name' => 'Anh Tuấn']),
        ($this->conversationOf)(['name' => 'Khách 1']),
        ($this->conversationOf)(['name' => 'Khách 2']),
        ($this->conversationOf)(['name' => 'Khách 3']),
    ];
    ($this->messageIn)($conversations[3], 'Nhận hàng chưa ạ', $sameTime);
    ($this->messageIn)($conversations[4], 'nhan hang roi', $sameTime);
    ($this->messageIn)($conversations[0], 'ẩn tin', $sameTime);
    ($this->messageIn)($conversations[5], 'không khớp gì');

    foreach (['an', 'Ạn', 'nhận hàng', 'ANH'] as $keyword) {
        $legacy = (new ConversationFinder(
            $this->admin,
            $this->account,
            $this->account->accountUsers()->where('user_id', $this->admin->id)->firstOrFail(),
            ['status' => 'all', 'q' => $keyword],
        ))->perform()['conversations']->pluck('display_id')->sort()->values()->all();
        $result = ($this->search)('q='.urlencode($keyword));
        $sectioned = collect($result['contacts'])->pluck('id')
            ->merge(collect($result['conversations'])->pluck('id'))
            ->unique()->sort()->values()->all();

        expect($sectioned)->toBe($legacy, "từ khoá {$keyword}");
    }
});

it('tìm trong danh sách lọc nâng cao giữ đúng bộ lọc', function () {
    $open = ($this->conversationOf)(['name' => 'Mít mở']);
    ($this->conversationOf)(['name' => 'Mít xong'], ['status' => Conversation::STATUS_RESOLVED]);

    $result = $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/conversations/filter/search?q=mit", [
            'payload' => [['attribute_key' => 'status', 'filter_operator' => 'equal_to', 'values' => ['open']]],
        ])
        ->assertOk()
        ->json('data');

    expect(collect($result['contacts'])->pluck('id')->all())->toBe([$open->display_id])
        ->and($result['meta']['all_count'])->toBe(1);
});

it('số truy vấn không tăng theo số kết quả', function () {
    $queryCount = function (): int {
        DB::flushQueryLog();
        DB::enableQueryLog();
        ($this->search)('q=mit');
        DB::disableQueryLog();

        return count(DB::getQueryLog());
    };
    $addMatches = function (int $count): void {
        foreach (range(1, $count) as $index) {
            ($this->messageIn)(($this->conversationOf)(['name' => "Mít {$index}"]), 'mít thái');
        }
    };

    $addMatches(2);
    // Lượt đầu sau mỗi lần đổi dữ liệu còn nạp cache (bảng tra, số đếm tab), không tính.
    $queryCount();
    $few = $queryCount();
    $addMatches(8);
    $queryCount();

    expect($queryCount())->toBe($few);
});

it('bắt buộc có từ khoá', function () {
    $this->actingAs($this->admin)
        ->getJson("/api/v1/accounts/{$this->account->id}/conversations/search?status=all")
        ->assertUnprocessable();
});
