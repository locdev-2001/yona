<?php

use App\Models\Account;
use App\Models\Article;
use App\Models\Category;
use App\Models\Portal;
use App\Models\User;
use App\Support\HelpCenter\ArticleMarkdown;

// Port từ spec/controllers/public/api/v1/portals/{articles,categories}_controller_spec.rb.
// Khác bản gốc: các URL ở đây không mang hậu tố `.json` (mặt tiền hiện tại chỉ
// trả JSON; trang HTML do E4-fe dựng sau).
beforeEach(function () {

    $this->account = Account::factory()->create();
    $this->author = User::factory()->create();

    $this->portal = Portal::factory()->create([
        'account_id' => $this->account->id,
        'slug' => 'test-portal',
        'config' => ['allowed_locales' => ['en', 'es']],
        'custom_domain' => 'www.example.com',
    ]);

    $this->categoryEn = Category::factory()->create([
        'portal_id' => $this->portal->id, 'name' => 'category', 'locale' => 'en', 'slug' => 'category_slug',
    ]);
    $this->categoryEs = Category::factory()->create([
        'portal_id' => $this->portal->id, 'name' => 'category', 'locale' => 'es', 'slug' => 'category_slug_es',
    ]);

    $this->article = e4PublicArticle($this->categoryEn, ['content' => 'This is a *test* content with ^markdown^', 'views' => 0]);
    e4PublicArticle($this->categoryEn, ['views' => 15]);
    e4PublicArticle($this->categoryEn, ['views' => 1, 'associated_article_id' => $this->article->id]);
    e4PublicArticle($this->categoryEs, ['views' => 5, 'associated_article_id' => $this->article->id]);
    e4PublicArticle($this->categoryEs, ['views' => 4]);
    e4PublicArticle($this->categoryEs, ['status' => 'draft']);
});

function e4PublicArticle(Category $category, array $overrides = []): Article
{
    return Article::factory()->create(array_replace([
        'portal_id' => test()->portal->id,
        'category_id' => $category->id,
        'author_id' => test()->author->id,
    ], $overrides));
}

it('lists only the published articles of the requested locale', function () {
    $payload = $this->getJson('/hc/test-portal/es/categories/category_slug/articles')->assertOk()->json('payload');

    expect($payload)->toHaveCount(2);
});

it('returns a snippet around the search term', function () {
    $longContent = trim(str_repeat('intro ', 30)).' funny '.trim(str_repeat('tail ', 30));
    e4PublicArticle($this->categoryEn, ['content' => $longContent]);

    $payload = $this->getJson('/hc/test-portal/en/categories/category_slug/articles?query=funny')->assertOk()->json('payload');

    expect($payload)->toHaveCount(1)
        ->and(array_keys($payload[0]))->toBe(['id', 'category_id', 'title', 'content', 'link'])
        ->and($payload[0]['content'])->toContain('funny')
        ->and(strlen($payload[0]['content']))->toBeLessThan(strlen($longContent));
});

it('limits the search results to the current locale', function () {
    e4PublicArticle($this->categoryEn, ['title' => 'English locale result', 'content' => 'shared-search-term here']);
    e4PublicArticle($this->categoryEs, ['title' => 'Spanish locale result', 'content' => 'shared-search-term aqui']);

    $payload = $this->getJson('/hc/test-portal/en/articles?query=shared-search-term')->assertOk()->json('payload');

    expect($payload)->toHaveCount(1)
        ->and($payload[0]['title'])->toBe('English locale result');
});

it('treats a whitespace-only query as no query at all', function () {
    $body = $this->getJson('/hc/test-portal/en/articles?query=%20%20%20')->assertOk()->json();

    expect($body['payload'])->toHaveCount(3)
        ->and($body['meta']['articles_count'])->toBe(3);
});

it('orders by views when asked to', function () {
    $payload = $this->getJson('/hc/test-portal/en/articles?sort=views')->assertOk()->json('payload');

    expect(collect($payload)->pluck('views')->all())->toBe([15, 1, 0]);
});

it('limits the results with per_page', function () {
    expect($this->getJson('/hc/test-portal/en/articles?per_page=2')->assertOk()->json('payload'))->toHaveCount(2);
});

it('counts the articles of every locale when no locale is given', function () {
    $body = $this->getJson('/hc/test-portal/articles')->assertOk()->json();

    expect($body['meta']['articles_count'])->toBe(5);
});

it('falls back to the default page size when per_page is below one', function () {
    expect($this->getJson('/hc/test-portal/en/articles?per_page=0')->assertOk()->json('payload'))->toHaveCount(3);
});

it('serves one article by slug without counting a view', function () {
    $payload = $this->getJson('/hc/test-portal/articles/'.$this->article->slug)->assertOk()->json();

    expect($payload['id'])->toBe($this->article->id)
        ->and($payload['link'])->toBe('hc/test-portal/articles/'.$this->article->slug)
        ->and($payload['content_html'])->toBe(ArticleMarkdown::toHtml($this->article->content))
        ->and($this->article->refresh()->views)->toBe(0);
});

it('serves the raw markdown of a published article', function () {
    $response = $this->get('/hc/test-portal/articles/'.$this->article->slug.'.md')->assertOk();

    expect($response->headers->get('content-type'))->toContain('text/markdown')
        ->and($response->content())->toBe($this->article->content);
});

it('hides the markdown of a draft article', function () {
    $draft = e4PublicArticle($this->categoryEn, ['status' => 'draft']);

    $this->getJson('/hc/test-portal/articles/'.$draft->slug.'.md')->assertNotFound();
    $this->getJson('/hc/test-portal/articles/non-existent-article.md')->assertNotFound();
});

it('counts a view through the tracking pixel of a published article', function () {
    $response = $this->get('/hc/test-portal/articles/'.$this->article->slug.'.png')->assertOk();

    expect($response->headers->get('content-type'))->toBe('image/png')
        ->and($response->headers->get('cache-control'))->toContain('private')
        ->and($this->article->refresh()->views)->toBe(1);
});

it('does not count a view of a draft article', function () {
    $draft = e4PublicArticle($this->categoryEn, ['status' => 'draft', 'views' => 0]);

    $this->get('/hc/test-portal/articles/'.$draft->slug.'.png')->assertOk();

    expect($draft->refresh()->views)->toBe(0);
});

it('answers not found for the pixel of an unknown article', function () {
    $this->getJson('/hc/test-portal/articles/non-existent-article.png')->assertNotFound();
});

it('lists the categories of a portal', function () {
    $payload = $this->getJson('/hc/test-portal/en/categories')->assertOk()->json('payload');

    expect($payload)->toHaveCount(2)
        ->and($payload[0])->toHaveKeys(['name', 'slug', 'locale', 'description', 'position', 'meta']);
});

it('serves one category by locale and slug', function () {
    $payload = $this->getJson('/hc/test-portal/en/categories/category_slug')->assertOk()->json();

    expect($payload['slug'])->toBe('category_slug')
        ->and($payload['meta']['articles_count'])->toBe(3);
});

it('serves the portal itself', function () {
    $payload = $this->getJson('/hc/test-portal/en')->assertOk()->json();

    expect($payload['slug'])->toBe('test-portal')
        ->and($payload['meta']['articles_count'])->toBe(5)
        ->and($payload['meta']['categories_count'])->toBe(2);
});

it('hides an archived portal', function () {
    $this->portal->update(['archived' => true]);

    $this->getJson('/hc/test-portal/en')->assertNotFound();
});

it('searches the published articles of a locale', function () {
    e4PublicArticle($this->categoryEn, ['title' => 'Findable guide', 'content' => 'needle in the haystack']);

    $body = $this->getJson('/hc/test-portal/en/search?query=needle')->assertOk()->json();

    expect($body['payload'])->toHaveCount(1)
        ->and($body['payload'][0]['title'])->toBe('Findable guide')
        ->and($body['payload'][0]['link'])->toStartWith('/hc/test-portal/articles/');
});

it('returns nothing for an empty search', function () {
    expect($this->getJson('/hc/test-portal/en/search?query=')->assertOk()->json('payload'))->toBe([]);
});
