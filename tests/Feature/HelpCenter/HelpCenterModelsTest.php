<?php

use App\Models\Account;
use App\Models\Article;
use App\Models\Category;
use App\Models\Portal;
use App\Models\User;

// Port từ spec/models/{portal,category,article,related_category}_spec.rb.
beforeEach(function () {
    $this->account = Account::factory()->create();
    $this->user = User::factory()->create();
});

function e4Portal(array $overrides = []): Portal
{
    return Portal::factory()->create(array_replace(['account_id' => test()->account->id], $overrides));
}

// ---------- Portal ----------

it('defaults the portal config to the english locale', function () {
    $portal = e4Portal();

    expect($portal->config['allowed_locales'])->toBe(['en'])
        ->and($portal->config['default_locale'])->toBe('en')
        ->and($portal->config['draft_locales'])->toBe([]);
});

it('refuses config keys outside the allow list', function () {
    $portal = e4Portal();
    $portal->config = ['some_other_key' => 'test_value'];

    expect($portal->validationMessages())->toContain('Config in portal on some_other_key is not supported.');
});

it('falls back to no drafted locales for an existing portal', function () {
    $portal = e4Portal();
    $portal->config = ['allowed_locales' => ['en', 'es'], 'default_locale' => 'en'];

    expect($portal->draftLocaleCodes())->toBe([])
        ->and($portal->publicLocaleCodes())->toBe(['en', 'es']);
});

it('keeps the drafted locales when draft_locales is omitted on update', function () {
    $portal = e4Portal();
    $portal->update(['config' => ['allowed_locales' => ['en', 'es', 'fr'], 'draft_locales' => ['es'], 'default_locale' => 'en']]);

    $portal->config = ['allowed_locales' => ['en', 'es', 'fr'], 'default_locale' => 'en'];
    $portal->save();

    expect($portal->refresh()->config['draft_locales'])->toBe(['es']);
});

it('refuses to draft the default locale', function () {
    $portal = e4Portal();
    $portal->config = ['allowed_locales' => ['en', 'es'], 'draft_locales' => ['en'], 'default_locale' => 'en'];

    expect($portal->validationMessages())->toContain('Config default locale cannot be drafted.');
});

it('turns an empty custom domain into null', function () {
    $portal = e4Portal();
    $portal->update(['custom_domain' => '']);

    expect($portal->refresh()->custom_domain)->toBeNull();
});

it('rejects unknown fields inside a locale translation', function () {
    $portal = e4Portal();
    $portal->config = ['allowed_locales' => ['en', 'es'], 'default_locale' => 'en', 'locale_translations' => ['es' => ['tagline' => 'nope']]];

    expect($portal->validationMessages())->not->toBe([]);
});

it('resolves a portal field for a locale with the documented fallbacks', function () {
    $portal = e4Portal([
        'name' => 'Help Center',
        'page_title' => 'Help Center | Acme',
        'config' => ['allowed_locales' => ['en', 'es'], 'default_locale' => 'en', 'locale_translations' => ['es' => ['name' => 'Centro de ayuda']]],
    ]);

    expect($portal->localizedValue('name', 'es'))->toBe('Centro de ayuda')
        ->and($portal->localizedValue('page_title', 'es'))->toBe('Help Center | Acme')
        ->and($portal->localizedValue('name', 'fr'))->toBe('Help Center')
        ->and($portal->localizedValue('name'))->toBe('Help Center');
});

it('keeps serving an override for a locale that became the default', function () {
    $portal = e4Portal([
        'name' => 'Help Center',
        'config' => ['allowed_locales' => ['en', 'es'], 'default_locale' => 'en', 'locale_translations' => ['es' => ['name' => 'Centro de ayuda']]],
    ]);

    $portal->update(['config' => ['allowed_locales' => ['en', 'es', 'fr'], 'default_locale' => 'es']]);

    expect($portal->localizedValue('name', 'es'))->toBe('Centro de ayuda')
        ->and($portal->localizedValue('name', 'fr'))->toBe('Centro de ayuda');
});

it('prefers the localized page title for the display title', function () {
    $portal = e4Portal([
        'name' => 'Help Center',
        'page_title' => 'Help Center | Acme',
        'config' => ['allowed_locales' => ['en', 'es'], 'default_locale' => 'en', 'locale_translations' => ['es' => ['page_title' => 'Centro | Acme']]],
    ]);

    expect($portal->displayTitle('es'))->toBe('Centro | Acme')
        ->and($portal->displayTitle())->toBe('Help Center | Acme');
});

// ---------- Category ----------

it('refuses a category locale the portal does not allow', function () {
    $portal = e4Portal(['config' => ['allowed_locales' => ['en']]]);
    $category = Category::factory()->create(['portal_id' => $portal->id, 'slug' => 'category_1', 'locale' => 'en']);

    $category->locale = 'es';

    expect($category->validationMessages()[0])->toBe('Locale es of category is not part of portal\'s ["en"].');
});

it('searches the categories of a portal by locale', function () {
    $portalOne = e4Portal(['config' => ['allowed_locales' => ['en', 'es']]]);
    $portalTwo = e4Portal(['config' => ['allowed_locales' => ['en', 'es']]]);

    Category::factory()->create(['portal_id' => $portalOne->id, 'slug' => 'category_1', 'locale' => 'en']);
    Category::factory()->create(['portal_id' => $portalOne->id, 'slug' => 'category_2', 'locale' => 'es']);
    Category::factory()->create(['portal_id' => $portalTwo->id, 'slug' => 'category_3', 'locale' => 'es']);

    expect(Category::search(Category::forPortal($portalOne), [])->count())->toBe(2)
        ->and(Category::search(Category::forPortal($portalTwo), ['locale' => 'es'])->count())->toBe(1)
        ->and(Category::search(Category::forPortal($portalOne), ['locale' => 'en'])->count())->toBe(1);
});

// ---------- Article ----------

it('requires content only for a published article', function () {
    $portal = e4Portal(['config' => ['allowed_locales' => ['en', 'es']]]);
    $category = Category::factory()->create(['portal_id' => $portal->id, 'slug' => 'category_1', 'locale' => 'en']);

    $article = new Article([
        'portal_id' => $portal->id, 'category_id' => $category->id, 'author_id' => $this->user->id,
        'title' => 'test', 'content' => null, 'status' => 'draft',
    ]);

    expect($article->validationMessages())->toBe([]);

    $article->status = 'published';

    expect($article->validationMessages())->toContain("Content can't be blank");
});

it('rejects reserved slugs that collide with help center routes', function () {
    $portal = e4Portal();

    foreach (Article::RESERVED_SLUGS as $reserved) {
        $article = new Article([
            'portal_id' => $portal->id, 'author_id' => $this->user->id,
            'title' => $reserved, 'slug' => $reserved, 'content' => 'content',
        ]);

        expect($article->validationMessages())->toContain('Slug is reserved');
    }
});

it('refuses content longer than the column limit', function () {
    $portal = e4Portal();
    $article = Article::factory()->create(['portal_id' => $portal->id, 'author_id' => $this->user->id]);

    $article->content = str_repeat('a', 1000);
    expect($article->validationMessages())->toBe([]);

    $article->content = str_repeat('a', 25001);
    expect($article->validationMessages())->toContain('Content is too long (maximum is 20000 characters)');
});

it('takes the locale from the category, then from the portal', function () {
    $portal = e4Portal(['config' => ['allowed_locales' => ['en', 'es', 'pt'], 'default_locale' => 'es']]);
    $category = Category::factory()->create(['portal_id' => $portal->id, 'slug' => 'category_1', 'locale' => 'pt']);

    $fromCategory = Article::factory()->create([
        'portal_id' => $portal->id, 'category_id' => $category->id, 'author_id' => $this->user->id,
    ]);
    $fromPortal = Article::factory()->create([
        'portal_id' => $portal->id, 'author_id' => $this->user->id, 'locale' => '',
    ]);

    expect($fromCategory->locale)->toBe('pt')->and($fromPortal->locale)->toBe('es');
});

it('searches the articles of a portal on every documented axis', function () {
    $portalOne = e4Portal(['config' => ['allowed_locales' => ['en', 'es']]]);
    $portalTwo = e4Portal(['config' => ['allowed_locales' => ['en', 'es']]]);
    $categoryOne = Category::factory()->create(['portal_id' => $portalOne->id, 'slug' => 'category_1', 'locale' => 'en']);
    $categoryTwo = Category::factory()->create(['portal_id' => $portalOne->id, 'slug' => 'category_2', 'locale' => 'es']);
    $categoryThree = Category::factory()->create(['portal_id' => $portalTwo->id, 'slug' => 'category_3', 'locale' => 'es']);

    $make = fn (Portal $portal, ?Category $category, string $slug, string $title, ?string $content, string $status) => Article::factory()->create([
        'portal_id' => $portal->id,
        'category_id' => $category?->id,
        'author_id' => $this->user->id,
        'slug' => $slug,
        'title' => $title,
        'content' => $content,
        'status' => $status,
    ]);

    $make($portalOne, $categoryOne, 'this-is-title', 'this is title', 'This is the content', 'draft');
    $make($portalOne, $categoryOne, 'title-1', 'title 1', 'This is the content', 'draft');
    $make($portalTwo, $categoryTwo, 'title-2', 'title 2', null, 'draft');
    $make($portalOne, $categoryTwo, 'title-3', 'title 3', null, 'draft');
    $make($portalTwo, $categoryThree, 'title-6', 'title 6', 'body', 'published');
    $make($portalOne, $categoryTwo, 'title-7', 'title 7', 'body', 'published');

    $search = fn (Portal $portal, array $params) => Article::search(Article::forPortal($portal), $params)->count();

    expect($search($portalOne, []))->toBe(4)
        ->and($search($portalTwo, []))->toBe(2)
        ->and($search($portalTwo, ['query' => 'title', 'locale' => 'es', 'category_slug' => 'category_3']))->toBe(1)
        ->and($search($portalOne, ['query' => 'this', 'locale' => 'en', 'category_slug' => 'category_1']))->toBe(2)
        ->and($search($portalOne, ['status' => 'published']))->toBe(1)
        ->and($search($portalOne, ['category_slug' => 'category_2']))->toBe(2)
        ->and($search($portalTwo, ['locale' => 'es']))->toBe(2)
        ->and($search($portalOne, ['locale' => 'en']))->toBe(2)
        ->and($search($portalTwo, ['query' => 'title']))->toBe(2)
        ->and($search($portalOne, ['query' => 'title']))->toBe(4)
        ->and($search($portalOne, ['query' => 'the content']))->toBe(2)
        ->and($search($portalOne, ['category_slug' => 'category_2', 'author_id' => $this->user->id]))->toBe(2);
});

it('auto generates the article slug from the title', function () {
    $portal = e4Portal();
    $article = Article::factory()->create([
        'portal_id' => $portal->id, 'author_id' => $this->user->id, 'title' => 'the awesome article 1', 'slug' => null,
    ]);

    expect($article->slug)->toBe('the-awesome-article-1');
});

it('re-spaces a category after a collided move and reports the new positions', function () {
    $portal = e4Portal();
    $category = Category::factory()->create(['portal_id' => $portal->id, 'slug' => 'positions']);

    $make = fn (int $position) => Article::factory()->create([
        'portal_id' => $portal->id, 'category_id' => $category->id, 'author_id' => $this->user->id, 'position' => $position,
    ]);

    $a = $make(10);
    $b = $make(11);
    $c = $make(30);

    $positions = Article::updatePositions($portal, [$c->id => 10]);

    expect($a->refresh()->position)->toBe(10)
        ->and($c->refresh()->position)->toBe(20)
        ->and($b->refresh()->position)->toBe(30)
        ->and($positions)->toBe([$a->id => 10, $c->id => 20, $b->id => 30]);
});

it('leaves a lone article untouched and returns nothing to sync', function () {
    $portal = e4Portal();
    $lone = Article::factory()->create([
        'portal_id' => $portal->id,
        'category_id' => Category::factory()->create(['portal_id' => $portal->id, 'slug' => 'lone'])->id,
        'author_id' => $this->user->id,
        'position' => 20,
    ]);

    expect(Article::updatePositions($portal, [$lone->id => 20]))->toBe([])
        ->and($lone->refresh()->position)->toBe(20);
});

it('moves an article to the end of its new category', function () {
    $portal = e4Portal();
    $source = Category::factory()->create(['portal_id' => $portal->id, 'slug' => 'source']);
    $target = Category::factory()->create(['portal_id' => $portal->id, 'slug' => 'target']);

    Article::factory()->create(['portal_id' => $portal->id, 'category_id' => $target->id, 'author_id' => $this->user->id, 'position' => 40]);
    $moved = Article::factory()->create(['portal_id' => $portal->id, 'category_id' => $source->id, 'author_id' => $this->user->id, 'position' => 10]);

    $moved->update(['category_id' => $target->id]);

    expect($moved->refresh()->position)->toBe(50);
});

it('counts a view only once per call', function () {
    $article = Article::factory()->create(['portal_id' => e4Portal()->id, 'author_id' => $this->user->id, 'views' => 0]);

    $article->incrementViewCount();

    expect($article->views)->toBe(1)->and($article->refresh()->views)->toBe(1);
});
