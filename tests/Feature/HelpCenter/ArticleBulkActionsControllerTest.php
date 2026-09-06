<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Article;
use App\Models\Category;
use App\Models\Portal;
use App\Models\User;

// Port từ spec/controllers/api/v1/accounts/articles/bulk_actions_controller_spec.rb.
beforeEach(function () {

    $this->account = Account::factory()->create();
    $this->admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $this->account->id, 'user_id' => $this->admin->id]);
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);

    $this->portal = Portal::factory()->create([
        'account_id' => $this->account->id,
        'config' => ['allowed_locales' => ['en', 'es']],
    ]);
    $this->category = Category::factory()->create([
        'portal_id' => $this->portal->id, 'locale' => 'en', 'slug' => 'getting-started',
    ]);

    $this->one = e4BulkArticle('draft');
    $this->two = e4BulkArticle('draft');
    $this->three = e4BulkArticle('published');

    $this->url = "/api/v1/accounts/{$this->account->id}/portals/{$this->portal->slug}/articles/bulk_actions";
});

function e4BulkArticle(string $status): Article
{
    return Article::factory()->create([
        'portal_id' => test()->portal->id,
        'category_id' => test()->category->id,
        'author_id' => test()->admin->id,
        'status' => $status,
    ]);
}

it('rejects unauthenticated users', function () {
    $this->patchJson($this->url.'/update_status', ['ids' => [$this->one->id], 'status' => 'published'])->assertUnauthorized();
});

it('rejects agents', function () {
    $this->actingAs($this->agent)
        ->patchJson($this->url.'/update_status', ['ids' => [$this->one->id], 'status' => 'published'])
        ->assertUnauthorized();
});

it('publishes several articles at once', function () {
    $this->actingAs($this->admin)
        ->patchJson($this->url.'/update_status', ['ids' => [$this->one->id, $this->two->id], 'status' => 'published'])
        ->assertOk();

    expect($this->one->refresh()->status)->toBe('published')
        ->and($this->two->refresh()->status)->toBe('published');
});

it('archives several articles at once', function () {
    $this->actingAs($this->admin)
        ->patchJson($this->url.'/update_status', ['ids' => [$this->one->id, $this->three->id], 'status' => 'archived'])
        ->assertOk();

    expect($this->one->refresh()->status)->toBe('archived')
        ->and($this->three->refresh()->status)->toBe('archived');
});

it('leaves the articles outside the list untouched', function () {
    $this->actingAs($this->admin)
        ->patchJson($this->url.'/update_status', ['ids' => [$this->one->id], 'status' => 'published'])
        ->assertOk();

    expect($this->two->refresh()->status)->toBe('draft');
});

it('refuses an unknown status', function () {
    $this->actingAs($this->admin)
        ->patchJson($this->url.'/update_status', ['ids' => [$this->one->id], 'status' => 'nope'])
        ->assertStatus(422)->assertJson(['error' => 'Invalid status value']);
});

it('refuses a status change when no article matches', function () {
    $this->actingAs($this->admin)
        ->patchJson($this->url.'/update_status', ['ids' => [0], 'status' => 'published'])
        ->assertStatus(422)->assertJson(['error' => 'No articles found to process']);
});

it('moves several articles to another category', function () {
    $target = Category::factory()->create(['portal_id' => $this->portal->id, 'locale' => 'en', 'slug' => 'advanced']);

    $this->actingAs($this->admin)
        ->patchJson($this->url.'/update_category', ['ids' => [$this->one->id, $this->two->id], 'category_id' => $target->id])
        ->assertOk();

    expect($this->one->refresh()->category_id)->toBe($target->id)
        ->and($this->two->refresh()->category_id)->toBe($target->id);
});

it('refuses a category that does not belong to the portal', function () {
    $foreign = Category::factory()->create(['slug' => 'foreign']);

    $this->actingAs($this->admin)
        ->patchJson($this->url.'/update_category', ['ids' => [$this->one->id], 'category_id' => $foreign->id])
        ->assertStatus(422)->assertJson(['error' => 'Category not found in this portal']);
});

it('deletes several articles at once', function () {
    $this->actingAs($this->admin)
        ->deleteJson($this->url.'/delete_articles', ['ids' => [$this->one->id, $this->two->id]])
        ->assertOk();

    expect(Article::query()->whereIn('id', [$this->one->id, $this->two->id])->count())->toBe(0)
        ->and(Article::query()->whereKey($this->three->id)->exists())->toBeTrue();
});

it('refuses a delete when no article matches', function () {
    $this->actingAs($this->admin)
        ->deleteJson($this->url.'/delete_articles', ['ids' => [0]])
        ->assertStatus(422);
});

it('answers not implemented for the captain translation', function () {
    $this->actingAs($this->admin)->postJson($this->url.'/translate', [])->assertStatus(501);
});
