<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\User;

describe('legacy inbox and label conversation routes', function () {
    beforeEach(function () {
        $this->user = User::factory()->create();
        $this->account = Account::factory()->create();
        AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->user->id]);
        $this->base = "/app/accounts/{$this->account->id}";
    });

    it('redirects to the query-string list', function (string $legacyPath, string $target) {
        $this->actingAs($this->user)->get("{$this->base}/{$legacyPath}")
            ->assertStatus(302)
            ->assertRedirect("{$this->base}/{$target}");
    })->with([
        'kênh' => ['inbox/5', 'conversations?inbox=5'],
        'kênh + hội thoại' => ['inbox/5/conversations/540', 'conversations/540?inbox=5'],
        'nhãn' => ['label/khach-vip', 'conversations?label=khach-vip'],
        'nhãn + hội thoại' => ['label/khach-vip/conversations/540', 'conversations/540?label=khach-vip'],
        'nhãn có dấu và khoảng trắng' => ['label/'.rawurlencode('cực dàng'), 'conversations?label=c%E1%BB%B1c+d%C3%A0ng'],
        'giữ messageId của link thông báo' => ['inbox/5/conversations/540?messageId=9', 'conversations/540?messageId=9&inbox=5'],
    ]);

    it('opens the conversation the redirect points to', function () {
        $this->actingAs($this->user)->get("{$this->base}/conversations/540?inbox=5")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard/conversation/ConversationView')
                ->where('conversationId', 540)
                ->missing('inboxId'));
    });

    it('keeps repeated label keys in the page url', function () {
        $url = "{$this->base}/conversations?inbox=5&label=a&label=c%E1%BB%B1c+d%C3%A0ng";

        $this->actingAs($this->user)->get($url)
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('dashboard/conversation/ConversationView')->url($url));
    });

    it('requires authentication', function () {
        $this->get("{$this->base}/inbox/5")->assertRedirect('/app/login');
    });
});
