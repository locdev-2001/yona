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

    it('keeps the list filter the draft was opened from', function (string $query, array $expected) {
        $this->actingAs($this->user)->get("/app/accounts/{$this->account->id}/inbox/new?{$query}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('inboxId', $expected['inboxId'])
                ->where('teamId', $expected['teamId'])
                ->where('label', $expected['label']));
    })->with([
        'hộp thư' => ['inbox_id=16', ['inboxId' => 16, 'teamId' => 0, 'label' => '']],
        'nhóm + người nhận' => ['team_id=4&contact_id=9', ['inboxId' => 0, 'teamId' => 4, 'label' => '']],
        'nhãn' => ['label=khach-vip', ['inboxId' => 0, 'teamId' => 0, 'label' => 'khach-vip']],
        'rác' => ['inbox_id=abc&label[]=x', ['inboxId' => 0, 'teamId' => 0, 'label' => '']],
    ]);

    it('keeps numeric inbox routes working', function () {
        $this->actingAs($this->user)->get("/app/accounts/{$this->account->id}/inbox/5")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('inboxId', 5)->missing('isComposing'));
    });

    it('requires authentication', function () {
        $this->get("/app/accounts/{$this->account->id}/inbox/new")->assertRedirect();
    });
});
