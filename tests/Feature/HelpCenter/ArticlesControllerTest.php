<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Article;
use App\Models\Category;
use App\Models\Portal;
use App\Models\User;

// Port từ spec/controllers/api/v1/accounts/articles_controller_spec.rb.
beforeEach(function () {

    $this->account = Account::factory()->create();
    $this->admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $this->account->id, 'user_id' => $this->admin->id]);
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);

    $this->portal = Portal::factory()->create(['account_id' => $this->account->id, 'name' => 'test_portal']);
    $this->category = Category::factory()->create([
        'portal_id' => $this->portal->id, 'name' => 'category', 'locale' => 'en', 'slug' => 'category_slug',
    ]);
    $this->article = e4Article(['category_id' => $this->category->id]);

    $this->url = "/api/v1/accounts/{$this->account->id}/portals/{$this->portal->slug}/articles";
});

function e4Article(array $overrides = []): Article
{
    return Article::factory()->create(array_replace([
        'portal_id' => test()->portal->id,
        'author_id' => test()->agent->id,
    ], $overrides));
}

it('rejects unauthenticated users', function () {
    $this->postJson($this->url, [])->assertUnauthorized();
});

it('creates an article', function () {
    $payload = $this->actingAs($this->admin)->postJson($this->url, ['article' => [
        'category_id' => $this->category->id,
        'description' => 'test description',
        'title' => 'MyTitle',
        'slug' => 'my-title',
        'content' => 'This is my content.',
        'status' => 'published',
        'author_id' => $this->agent->id,
        'position' => 3,
    ]])->assertOk()->json('payload');

    expect($payload['title'])->toBe('MyTitle')
        ->and($payload['status'])->toBe('published')
        ->and($payload['position'])->toBe(3);
});

it('rejects a cross-account author without exposing their details', function () {
    $foreign = User::factory()->create();

    $response = $this->actingAs($this->admin)->postJson($this->url, ['article' => [
        'category_id' => $this->category->id,
        'title' => 'MyTitle',
        'slug' => 'my-title',
        'content' => 'This is my content.',
        'status' => 'published',
        'author_id' => $foreign->id,
    ]])->assertStatus(422);

    expect($response->json())->toBe(['error' => 'Invalid author ID'])
        ->and($response->content())->not->toContain($foreign->email)
        ->and($this->portal->articles()->count())->toBe(1);
});

it('rejects a malformed author id without raising', function () {
    foreach ([['3', '4'], ' 3 ', '3abc'] as $badAuthorId) {
        $this->actingAs($this->admin)->postJson($this->url, ['article' => [
            'title' => 'MyTitle', 'slug' => 'my-title-'.uniqid(), 'content' => 'body', 'author_id' => $badAuthorId,
        ]])->assertStatus(422)->assertExactJson(['error' => 'Invalid author ID']);
    }
});

it('creates an article without a category', function () {
    $payload = $this->actingAs($this->admin)->postJson($this->url, ['article' => [
        'category_id' => null,
        'title' => 'MyTitle',
        'slug' => 'my-title',
        'content' => 'This is my content.',
        'status' => 'published',
        'author_id' => $this->agent->id,
        'position' => 3,
    ]])->assertOk()->json('payload');

    expect($payload['status'])->toBe('published')->and($payload['position'])->toBe(3);
});

it('defaults a new article to draft', function () {
    $payload = $this->actingAs($this->admin)->postJson($this->url, ['article' => [
        'category_id' => $this->category->id,
        'title' => 'DraftTitle',
        'slug' => 'draft-title',
        'content' => 'This is my draft content.',
        'author_id' => $this->agent->id,
    ]])->assertOk()->json('payload');

    expect($payload['status'])->toBe('draft');
});

// Ràng buộc founder: không có ô slug trên form.
it('generates an ascii slug from the vietnamese title when none is given', function () {
    $payload = $this->actingAs($this->admin)->postJson($this->url, ['article' => [
        'title' => 'Cách đặt lịch hẹn',
        'content' => 'noi dung',
        'author_id' => $this->agent->id,
    ]])->assertOk()->json('payload');

    expect($payload['slug'])->toBe('cach-dat-lich-hen');
});

it('links a new article to the root of the association chain', function () {
    $root = e4Article(['category_id' => $this->category->id, 'slug' => 'root-article']);
    $parent = e4Article(['category_id' => $this->category->id, 'slug' => 'parent-article', 'associated_article_id' => $root->id]);

    $payload = $this->actingAs($this->admin)->postJson($this->url, ['article' => [
        'category_id' => $this->category->id,
        'title' => 'MyTitle',
        'slug' => 'my-title',
        'content' => 'This is my content.',
        'status' => 'published',
        'author_id' => $this->agent->id,
        'associated_article_id' => $parent->id,
    ]])->assertOk()->json('payload');

    expect(Article::query()->find($payload['id'])->associated_article_id)->toBe($root->id);
});

it('updates an article', function () {
    $payload = $this->actingAs($this->admin)->putJson($this->url.'/'.$this->article->id, ['article' => [
        'title' => 'MyTitle2', 'status' => 'published', 'description' => 'test_description', 'position' => 5,
    ]])->assertOk()->json('payload');

    expect($payload['title'])->toBe('MyTitle2')
        ->and($payload['status'])->toBe('published')
        ->and($payload['position'])->toBe(5);
});

it('ignores a cross-account author while updating other attributes', function () {
    $foreign = User::factory()->create();

    $response = $this->actingAs($this->admin)->putJson($this->url.'/'.$this->article->id, [
        'article' => ['title' => 'Updated title', 'author_id' => $foreign->id],
    ])->assertOk();

    expect($response->json('payload.title'))->toBe('Updated title')
        ->and($response->json('payload.author.id'))->toBe($this->agent->id)
        ->and($response->content())->not->toContain($foreign->email)
        ->and($this->article->refresh()->author_id)->toBe($this->agent->id);
});

it('stages draft-only fields without bumping updated_at', function () {
    $before = $this->article->updated_at;

    $this->actingAs($this->admin)->putJson($this->url.'/'.$this->article->id, [
        'article' => ['draft_title' => 'Draft title', 'draft_content' => 'Draft body'],
    ])->assertOk();

    $this->article->refresh();

    expect($this->article->updated_at->equalTo($before))->toBeTrue()
        ->and($this->article->draft_title)->toBe('Draft title')
        ->and($this->article->draft_content)->toBe('Draft body');
});

it('rejects an over-length draft without persisting it', function () {
    $this->actingAs($this->admin)->putJson($this->url.'/'.$this->article->id, [
        'article' => ['draft_content' => str_repeat('a', 20001)],
    ])->assertStatus(422)->assertJsonFragment(['message' => 'Draft content is too long (maximum is 20000 characters)']);

    expect($this->article->refresh()->draft_content)->toBeNull();
});

it('does not expose an author who is not a member of the account', function () {
    $foreign = User::factory()->create();
    $this->article->update(['author_id' => $foreign->id]);

    $response = $this->actingAs($this->admin)->getJson($this->url.'/'.$this->article->id)->assertOk();

    expect($response->json('payload'))->not->toHaveKey('author')
        ->and($response->content())->not->toContain($foreign->email);
});

it('deletes an article', function () {
    $this->actingAs($this->admin)->deleteJson($this->url.'/'.$this->article->id)->assertOk();

    expect(Article::query()->find($this->article->id))->toBeNull();
});

it('reorders the articles', function () {
    $second = e4Article(['category_id' => $this->category->id, 'position' => 20]);

    $this->actingAs($this->admin)->postJson($this->url.'/reorder', ['positions_hash' => [
        $this->article->id => 20,
        $second->id => 10,
    ]])->assertOk();

    expect($this->article->refresh()->position)->toBe(20)
        ->and($second->refresh()->position)->toBe(10);
});

it('lists the articles of the portal', function () {
    e4Article(['category_id' => $this->category->id]);

    expect($this->actingAs($this->admin)->getJson($this->url)->assertOk()->json('payload'))->toHaveCount(2);
});

it('lists uncategorized articles first when they are the most recent', function () {
    $uncategorized = e4Article(['category_id' => null, 'locale' => 'en']);

    $payload = $this->actingAs($this->admin)->getJson($this->url)->assertOk()->json('payload');

    expect($payload)->toHaveCount(2)
        ->and($payload[0]['id'])->toBe($uncategorized->id)
        ->and($payload[0]['category']['id'])->toBeNull();
});

it('filters the articles by category slug', function () {
    e4Article(['category_id' => $this->category->id]);

    $payload = $this->actingAs($this->admin)->getJson($this->url.'?category_slug='.$this->category->slug)
        ->assertOk()->json('payload');

    expect($payload)->toHaveCount(2);
});

it('filters the articles by full text query and reports the tab counters', function () {
    e4Article(['category_id' => $this->category->id, 'content' => 'this is some test and funny content']);

    $body = $this->actingAs($this->admin)->getJson($this->url.'?query=funny')->assertOk()->json();

    expect($body['payload'])->toHaveCount(1)
        ->and($body['meta']['all_articles_count'])->toBe(2)
        ->and($body['meta']['articles_count'])->toBe(1)
        ->and($body['meta']['mine_articles_count'])->toBe(0);
});

it('returns the associated articles of a root article', function () {
    $root = e4Article(['category_id' => $this->category->id]);
    $childOne = e4Article(['category_id' => $this->category->id, 'slug' => 'child-1', 'associated_article_id' => $root->id]);
    $childTwo = e4Article(['category_id' => $this->category->id, 'slug' => 'child-2', 'associated_article_id' => $root->id]);

    $payload = $this->actingAs($this->admin)->getJson($this->url.'/'.$root->id)->assertOk()->json('payload');

    expect(collect($payload['associated_articles'])->pluck('id')->sort()->values()->all())
        ->toBe(collect([$childOne->id, $childTwo->id])->sort()->values()->all());
});
