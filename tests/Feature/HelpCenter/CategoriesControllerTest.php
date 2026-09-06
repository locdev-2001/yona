<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Category;
use App\Models\Portal;
use App\Models\User;

// Port từ spec/controllers/api/v1/accounts/categories_controller_spec.rb.
beforeEach(function () {

    $this->account = Account::factory()->create();
    $this->admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $this->account->id, 'user_id' => $this->admin->id]);
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);

    $this->portal = Portal::factory()->create([
        'account_id' => $this->account->id,
        'name' => 'test_portal',
        'config' => ['allowed_locales' => ['en', 'es']],
    ]);

    $this->category = e4Category('category', 'category_slug', 1);
    $this->categoryToAssociate = e4Category('associated category', 'associated_category_slug', 2);
    $this->relatedOne = e4Category('related category 1', 'category_slug_1', 3);
    $this->relatedTwo = e4Category('related category 2', 'category_slug_2', 4);

    $this->url = "/api/v1/accounts/{$this->account->id}/portals/{$this->portal->slug}/categories";
});

function e4Category(string $name, string $slug, int $position, string $locale = 'en'): Category
{
    return Category::factory()->create([
        'portal_id' => test()->portal->id,
        'name' => $name,
        'slug' => $slug,
        'position' => $position,
        'locale' => $locale,
    ]);
}

it('rejects unauthenticated users', function () {
    $this->postJson($this->url, [])->assertUnauthorized();
});

it('creates a category with its relations', function () {
    $payload = $this->actingAs($this->admin)->postJson($this->url, ['category' => [
        'name' => 'test_category',
        'description' => 'test_description',
        'position' => 5,
        'locale' => 'es',
        'slug' => 'test_category_1',
        'parent_category_id' => $this->category->id,
        'associated_category_id' => $this->categoryToAssociate->id,
        'related_category_ids' => [$this->relatedOne->id, $this->relatedTwo->id],
    ]])->assertOk()->json('payload');

    $created = Category::query()->latest('id')->first();

    expect($payload['related_categories'][0]['id'])->toBe($this->relatedOne->id)
        ->and($payload['related_categories'][1]['id'])->toBe($this->relatedTwo->id)
        ->and($payload['parent_category']['id'])->toBe($this->category->id)
        ->and($payload['root_category']['id'])->toBe($this->categoryToAssociate->id)
        ->and($this->category->subCategories()->pluck('id')->all())->toBe([$created->id])
        ->and($this->categoryToAssociate->associatedCategories()->pluck('id')->all())->toBe([$created->id]);
});

it('refuses a second category with the same slug and locale', function () {
    $body = ['category' => ['name' => 'test_category', 'locale' => 'es', 'slug' => 'test_category_1']];

    $this->actingAs($this->admin)->postJson($this->url, $body)->assertOk();
    $this->actingAs($this->admin)->postJson($this->url, $body)
        ->assertStatus(422)
        ->assertJson(['message' => 'Locale should be unique in the category and portal']);
});

// Khác bản gốc: người dùng không điền slug, backend tự sinh (lệnh founder).
it('generates an ascii slug from the vietnamese name when none is given', function () {
    $payload = $this->actingAs($this->admin)
        ->postJson($this->url, ['category' => ['name' => 'Hướng dẫn sử dụng', 'locale' => 'en']])
        ->assertOk()->json('payload');

    expect($payload['slug'])->toBe('huong-dan-su-dung');
});

it('still refuses a category without a name', function () {
    $this->actingAs($this->admin)->postJson($this->url, ['category' => ['locale' => 'es']])
        ->assertStatus(422)->assertJson(['message' => "Name can't be blank"]);
});

it('refuses a locale that the portal does not allow', function () {
    $this->actingAs($this->admin)->postJson($this->url, ['category' => ['name' => 'x', 'locale' => 'fr']])
        ->assertStatus(422)
        ->assertJson(['message' => 'Locale fr of category is not part of portal\'s ["en","es"].']);
});

it('updates a category and its parent', function () {
    $payload = $this->actingAs($this->admin)->putJson($this->url.'/'.$this->category->id, ['category' => [
        'name' => 'test_category_2',
        'description' => 'test_description',
        'position' => 1,
        'related_category_ids' => [$this->relatedOne->id],
        'parent_category_id' => $this->relatedTwo->id,
    ]])->assertOk()->json('payload');

    expect($payload['name'])->toBe('test_category_2')
        ->and($payload['related_categories'][0]['id'])->toBe($this->relatedOne->id)
        ->and($payload['parent_category']['id'])->toBe($this->relatedTwo->id)
        ->and($this->relatedTwo->subCategories()->pluck('id')->all())->toBe([$this->category->id]);
});

it('replaces the related categories', function () {
    $this->category->relatedCategories()->attach($this->relatedTwo->id);

    $payload = $this->actingAs($this->admin)
        ->putJson($this->url.'/'.$this->category->id, ['category' => ['related_category_ids' => [$this->relatedOne->id]]])
        ->assertOk()->json('payload');

    expect($payload['related_categories'][0]['id'])->toBe($this->relatedOne->id)
        ->and($this->category->relatedCategories()->pluck('categories.id')->all())->toBe([$this->relatedOne->id])
        ->and($this->relatedOne->relatedCategories()->pluck('categories.id')->all())->toBe([]);
});

// Liên kết một chiều: A→B không tự tạo B→A.
it('keeps the two directions of a related pair independent', function () {
    $this->category->relatedCategories()->attach($this->relatedTwo->id);

    $this->actingAs($this->admin)
        ->putJson($this->url.'/'.$this->relatedTwo->id, ['category' => ['related_category_ids' => [$this->category->id]]])
        ->assertOk();

    expect($this->category->relatedCategories()->pluck('categories.id')->all())->toBe([$this->relatedTwo->id])
        ->and($this->relatedTwo->relatedCategories()->pluck('categories.id')->all())->toBe([$this->category->id]);
});

it('deletes a category', function () {
    $this->actingAs($this->admin)->deleteJson($this->url.'/'.$this->category->id)->assertOk();

    expect(Category::query()->find($this->category->id))->toBeNull();
});

it('reorders the categories', function () {
    $this->actingAs($this->admin)->postJson($this->url.'/reorder', ['positions_hash' => [
        $this->category->id => 40,
        $this->categoryToAssociate->id => 10,
        $this->relatedOne->id => 30,
        $this->relatedTwo->id => 20,
    ]])->assertOk();

    expect($this->category->refresh()->position)->toBe(40)
        ->and($this->categoryToAssociate->refresh()->position)->toBe(10)
        ->and($this->relatedOne->refresh()->position)->toBe(30)
        ->and($this->relatedTwo->refresh()->position)->toBe(20);
});

it('returns not found when the portal does not exist', function () {
    $this->actingAs($this->admin)
        ->postJson("/api/v1/accounts/{$this->account->id}/portals/invalid-portal-slug/categories/reorder", ['positions_hash' => []])
        ->assertNotFound();
});

it('lists the categories of the portal', function () {
    e4Category('test_category_2', 'category_slug_5', 5, 'es');

    $payload = $this->actingAs($this->admin)->getJson($this->url)->assertOk()->json();

    expect($payload['payload'])->toHaveCount(5)
        ->and($payload['meta']['categories_count'])->toBe(5);
});

it('lets an agent list the categories', function () {
    $this->actingAs($this->agent)->getJson($this->url)->assertOk();
});
