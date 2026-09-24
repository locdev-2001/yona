<?php

use App\Jobs\Labels\RemoveAssociationsJob;
use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Conversation;
use App\Models\Inbox;
use App\Models\Label;
use App\Models\User;
use Illuminate\Support\Facades\Queue;

// Port từ spec/controllers/api/v1/accounts/labels_controller_spec.rb, cộng các
// case validate title (spec/models/label_spec.rb) vì validate nằm ở tầng nhận input.

function labelAccountUser(Account $account, int $role): User
{
    $user = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $account->id, 'user_id' => $user->id, 'role' => $role]);

    return $user;
}

beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->label = Label::factory()->create(['account_id' => $this->account->id, 'title' => 'support']);
    $this->admin = labelAccountUser($this->account, AccountUser::ROLE_ADMINISTRATOR);
    $this->agent = labelAccountUser($this->account, AccountUser::ROLE_AGENT);
});

describe('GET /api/v1/accounts/{id}/labels', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("/api/v1/accounts/{$this->account->id}/labels")->assertUnauthorized();
    });

    it('returns all the labels in the account for an agent', function () {
        $response = $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/labels")
            ->assertOk();

        expect($response->json('payload.0'))->toBe([
            'id' => $this->label->id,
            'title' => 'support',
            'description' => $this->label->description,
            'color' => Label::DEFAULT_COLOR,
            'show_on_sidebar' => true,
        ]);
    });

    it('sorts labels by title', function () {
        Label::factory()->create(['account_id' => $this->account->id, 'title' => 'billing']);

        $response = $this->actingAs($this->admin)->getJson("/api/v1/accounts/{$this->account->id}/labels")->assertOk();

        expect(array_column($response->json('payload'), 'title'))->toBe(['billing', 'support']);
    });
});

describe('GET /api/v1/accounts/{id}/labels/{labelId}', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->getJson("/api/v1/accounts/{$this->account->id}/labels/{$this->label->id}")->assertUnauthorized();
    });

    it('shows the label for an administrator', function () {
        $this->actingAs($this->admin)
            ->getJson("/api/v1/accounts/{$this->account->id}/labels/{$this->label->id}")
            ->assertOk()
            ->assertJsonPath('title', 'support');
    });

    it('returns unauthorized for an agent', function () {
        $this->actingAs($this->agent)
            ->getJson("/api/v1/accounts/{$this->account->id}/labels/{$this->label->id}")
            ->assertUnauthorized();
    });
});

describe('POST /api/v1/accounts/{id}/labels', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->postJson("/api/v1/accounts/{$this->account->id}/labels", ['title' => 'test'])->assertUnauthorized();

        expect(Label::query()->count())->toBe(1);
    });

    it('creates the label', function () {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/labels", ['title' => 'Test'])
            ->assertOk()
            ->assertJsonPath('title', 'Test')
            ->assertJsonPath('color', Label::DEFAULT_COLOR);

        expect(Label::query()->where('account_id', $this->account->id)->count())->toBe(2);
    });

    it('accepts the payload wrapped in a label key', function () {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/labels", ['label' => ['title' => 'wrapped', 'color' => '#ff0000']])
            ->assertOk()
            ->assertJsonPath('title', 'wrapped')
            ->assertJsonPath('color', '#ff0000');
    });

    it('returns unauthorized for an agent', function () {
        $this->actingAs($this->agent)
            ->postJson("/api/v1/accounts/{$this->account->id}/labels", ['title' => 'test'])
            ->assertUnauthorized();
    });

    it('accepts a free-form display title', function () {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/labels", ['title' => '  Khách VIP #1 / Mới!  '])
            ->assertOk()
            ->assertJsonPath('title', 'Khách VIP #1 / Mới!');
    });

    it('rejects a title containing a line break', function () {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/labels", ['title' => "hello\nworld"])
            ->assertStatus(422);
    });

    // Khác bản gốc: middleware TrimStrings của Laravel cắt khoảng trắng hai đầu
    // TRƯỚC khi validate, nên title kết thúc bằng xuống dòng được nhận và lưu
    // dạng đã cắt (Chatwoot trả 422 nhờ neo \z).
    it('trims surrounding whitespace before saving the title', function () {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/labels", ['title' => '  Hello World!  '])
            ->assertOk()
            ->assertJsonPath('title', 'Hello World!');
    });

    it('accepts foreign characters', function () {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/labels", ['title' => '学中文_12'])
            ->assertOk()
            ->assertJsonPath('title', '学中文_12');
    });

    it('accepts uppercase Vietnamese titles without converting them to slugs', function () {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/labels", ['title' => '  Khách VIP  '])
            ->assertOk()
            ->assertJsonPath('title', 'Khách VIP');
    });

    it('keeps a Vietnamese title intact from quick creation to the conversation it is attached to', function () {
        $inbox = Inbox::factory()->create(['account_id' => $this->account->id]);
        $conversation = Conversation::factory()->create(['account_id' => $this->account->id, 'inbox_id' => $inbox->id]);

        foreach (['Khách VIP', 'Chờ chuyển khoản'] as $title) {
            $this->actingAs($this->admin)
                ->postJson("/api/v1/accounts/{$this->account->id}/labels", [
                    'title' => $title,
                    'description' => '',
                    'color' => '#3A7BD5',
                    'show_on_sidebar' => true,
                ])
                ->assertOk()
                ->assertJsonPath('title', $title);
        }

        $this->actingAs($this->admin)
            ->postJson(
                "/api/v1/accounts/{$this->account->id}/conversations/{$conversation->display_id}/labels",
                ['labels' => ['Khách VIP', 'Chờ chuyển khoản']]
            )
            ->assertOk()
            ->assertJsonPath('payload', ['Khách VIP', 'Chờ chuyển khoản']);

        expect(Label::query()->where('account_id', $this->account->id)->pluck('title')->all())
            ->toContain('Khách VIP', 'Chờ chuyển khoản');
    });

    it('rejects a title already used in the account', function () {
        $this->actingAs($this->admin)
            ->postJson("/api/v1/accounts/{$this->account->id}/labels", ['title' => 'SUPPORT'])
            ->assertStatus(422);
    });

    it('allows the same title in another account', function () {
        $otherAccount = Account::factory()->create();
        $otherAdmin = labelAccountUser($otherAccount, AccountUser::ROLE_ADMINISTRATOR);

        $this->actingAs($otherAdmin)
            ->postJson("/api/v1/accounts/{$otherAccount->id}/labels", ['title' => 'support'])
            ->assertOk();
    });
});

describe('PATCH /api/v1/accounts/{id}/labels/{labelId}', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->putJson("/api/v1/accounts/{$this->account->id}/labels/{$this->label->id}", ['title' => 'Test_2'])
            ->assertUnauthorized();
    });

    it('updates the label', function () {
        $this->actingAs($this->admin)
            ->patchJson("/api/v1/accounts/{$this->account->id}/labels/{$this->label->id}", ['title' => 'Test_2'])
            ->assertOk();

        expect($this->label->fresh()->title)->toBe('Test_2');
    });

    it('keeps its own title valid on update', function () {
        $this->actingAs($this->admin)
            ->patchJson("/api/v1/accounts/{$this->account->id}/labels/{$this->label->id}", ['description' => 'hi'])
            ->assertOk()
            ->assertJsonPath('description', 'hi');
    });
});

describe('DELETE /api/v1/accounts/{id}/labels/{labelId}', function () {
    it('returns unauthorized for an unauthenticated user', function () {
        $this->deleteJson("/api/v1/accounts/{$this->account->id}/labels/{$this->label->id}")->assertUnauthorized();
    });

    it('deletes the label and enqueues the cleanup job', function () {
        $conversation = Conversation::factory()->create(['account_id' => $this->account->id]);
        $conversation->updateLabels(['support']);
        Queue::fake();

        $this->actingAs($this->admin)
            ->deleteJson("/api/v1/accounts/{$this->account->id}/labels/{$this->label->id}")
            ->assertOk();

        Queue::assertPushed(RemoveAssociationsJob::class, fn (RemoveAssociationsJob $job) => $job->labelTitle === 'support'
            && $job->accountId === $this->account->id
            && $job->queue === 'default');

        expect(Label::query()->whereKey($this->label->id)->exists())->toBeFalse()
            ->and($conversation->labelList())->toBe([]);
    });

    it('returns unauthorized for an agent', function () {
        $this->actingAs($this->agent)
            ->deleteJson("/api/v1/accounts/{$this->account->id}/labels/{$this->label->id}")
            ->assertUnauthorized();
    });
});
