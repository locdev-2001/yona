<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;

describe('compose conversation draft page', function () {
    beforeEach(function () {
        $this->user = User::factory()->create();
        $this->account = Account::factory()->create();
        AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->user->id]);
    });

    it('renders the inbox page in draft mode without a recipient', function () {
        $this->actingAs($this->user)->get("/app/accounts/{$this->account->id}/inbox/new")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/conversation/ConversationView')
                ->where('isComposing', true)
                ->where('composeContactId', null));
    });

    it('passes a valid contact_id through and ignores garbage', function (string $query, ?int $expected) {
        $this->actingAs($this->user)->get("/app/accounts/{$this->account->id}/inbox/new?{$query}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('composeContactId', $expected));
    })->with([
        'số hợp lệ' => ['contact_id=42', 42],
        'chữ' => ['contact_id=abc', null],
        'số âm' => ['contact_id=-3', null],
    ]);

    it('keeps the team the draft was opened from', function (string $query, int $expected) {
        $this->actingAs($this->user)->get("/app/accounts/{$this->account->id}/inbox/new?{$query}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('teamId', $expected)->missing('inboxId')->missing('label'));
    })->with([
        'nhóm + người nhận' => ['team_id=4&contact_id=9', 4],
        'kênh/nhãn ở query do trình duyệt đọc' => ['inbox=16&label=khach-vip', 0],
        'rác' => ['team_id=abc', 0],
    ]);

    it('requires authentication', function () {
        $this->get("/app/accounts/{$this->account->id}/inbox/new")->assertRedirect();
    });
});
