<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Label;
use App\Models\User;

// Port từ spec/controllers/api/v1/accounts/conversations/labels_controller_spec.rb.
// Bản gốc gán được title tự do; ở đây nhãn phải tồn tại trong account trước
// (taggings có khóa ngoại) nên các case tạo sẵn nhãn.

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
    $this->conversation = Conversation::factory()->create([
        'account_id' => $this->account->id,
        'inbox_id' => $this->inbox->id,
    ]);

    foreach (['label1', 'label2', 'label3', 'label4'] as $title) {
        Label::factory()->create(['account_id' => $this->account->id, 'title' => $title]);
    }

    $this->conversation->updateLabels('label1, label2');

    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);
    $this->inbox->inboxMembers()->create(['user_id' => $this->agent->id]);
});

describe('GET /api/v1/accounts/{id}/conversations/{displayId}/labels', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}/labels")
            ->assertUnauthorized();
    });

    it('returns all the labels of the conversation', function () {
        $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}/labels")
            ->assertOk()
            ->assertJsonPath('payload', ['label1', 'label2']);
    });

    it('returns unauthorized for an agent outside the inbox', function () {
        $outsider = User::factory()->create();
        AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $outsider->id]);

        $this->actingAs($outsider)
            ->getJson("/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}/labels")
            ->assertUnauthorized();
    });
});

describe('POST /api/v1/accounts/{id}/conversations/{displayId}/labels', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->postJson(
            "/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}/labels",
            ['labels' => ['label3', 'label4']]
        )->assertUnauthorized();
    });

    it('replaces the labels of the conversation', function () {
        $this->actingAs($this->agent)
            ->postJson(
                "/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}/labels",
                ['labels' => ['label3', 'label4']]
            )
            ->assertOk()
            ->assertJsonPath('payload', ['label3', 'label4']);

        expect($this->conversation->fresh()->cached_label_list)->toBe('label3, label4');
    });

    it('clears the labels when an empty list is sent', function () {
        $this->actingAs($this->agent)
            ->postJson(
                "/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}/labels",
                ['labels' => []]
            )
            ->assertOk()
            ->assertJsonPath('payload', []);

        expect($this->conversation->fresh()->cached_label_list)->toBe('');
    });

    it('exposes the labels on the conversation payload', function () {
        $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}")
            ->assertOk()
            ->assertJsonPath('labels', ['label1', 'label2']);
    });

    it('drops titles that are not labels of the account', function () {
        $this->actingAs($this->agent)
            ->postJson(
                "/api/v1/accounts/{$this->account->id}/conversations/{$this->conversation->display_id}/labels",
                ['labels' => ['label3', 'not-a-label']]
            )
            ->assertOk()
            ->assertJsonPath('payload', ['label3']);
    });
});
