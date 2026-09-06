<?php

use App\Models\Account;
use App\Models\AccountUser;
use App\Models\Article;
use App\Models\Category;
use App\Models\Channel\WebWidget;
use App\Models\Inbox;
use App\Models\Portal;
use App\Models\User;
use App\Notifications\PortalCnameInstructions;
use Illuminate\Support\Facades\Notification;

// Port từ spec/controllers/api/v1/accounts/portals_controller_spec.rb.
beforeEach(function () {

    $this->account = Account::factory()->create();
    $this->admin = User::factory()->create();
    AccountUser::factory()->administrator()->create(['account_id' => $this->account->id, 'user_id' => $this->admin->id]);
    $this->agent = User::factory()->create();
    AccountUser::factory()->create(['account_id' => $this->account->id, 'user_id' => $this->agent->id]);

    $this->portal = Portal::factory()->create([
        'account_id' => $this->account->id,
        'slug' => 'portal-1',
        'name' => 'test_portal',
    ]);

    $this->url = "/api/v1/accounts/{$this->account->id}/portals";
});

it('rejects unauthenticated users', function () {
    $this->getJson($this->url)->assertUnauthorized();
});

it('lists every portal of the account', function () {
    Portal::factory()->create(['account_id' => $this->account->id, 'slug' => 'portal-2', 'name' => 'test_portal_2']);

    $payload = $this->actingAs($this->admin)->getJson($this->url)->assertOk()->json();

    expect($payload['payload'])->toHaveCount(2)
        ->and($payload['payload'][0]['id'])->toBe($this->portal->id);
});

it('shows one portal with empty article metadata', function () {
    $payload = $this->actingAs($this->admin)->getJson($this->url.'/portal-1')->assertOk()->json();

    expect($payload['name'])->toBe('test_portal')
        ->and($payload['meta']['all_articles_count'])->toBe(0);
});

it('counts the articles of the requested locale and of the current user', function () {
    $this->portal->update(['config' => ['allowed_locales' => ['en', 'es'], 'default_locale' => 'en']]);
    $en = Category::factory()->create(['portal_id' => $this->portal->id, 'locale' => 'en', 'slug' => 'en-cat']);
    $es = Category::factory()->create(['portal_id' => $this->portal->id, 'locale' => 'es', 'slug' => 'es-cat']);

    Article::factory()->create(['portal_id' => $this->portal->id, 'category_id' => $en->id, 'author_id' => $this->agent->id]);
    Article::factory()->create(['portal_id' => $this->portal->id, 'category_id' => $en->id, 'author_id' => $this->admin->id]);
    Article::factory()->create(['portal_id' => $this->portal->id, 'category_id' => $es->id, 'author_id' => $this->agent->id]);

    $payload = $this->actingAs($this->admin)->getJson($this->url.'/portal-1?locale=en')->assertOk()->json();

    expect($payload['meta']['all_articles_count'])->toBe(2)
        ->and($payload['meta']['mine_articles_count'])->toBe(1);
});

it('rejects portal creation by an agent', function () {
    $this->actingAs($this->agent)->postJson($this->url, [])->assertUnauthorized();
});

it('creates a portal and keeps only the host of the custom domain', function () {
    $payload = $this->actingAs($this->admin)->postJson($this->url, [
        'portal' => ['name' => 'test_portal', 'slug' => 'test_kbase', 'custom_domain' => 'https://support.chatwoot.dev'],
    ])->assertOk()->json();

    expect($payload['name'])->toBe('test_portal')
        ->and($payload['custom_domain'])->toBe('support.chatwoot.dev');
});

it('creates a portal without a custom domain', function () {
    $payload = $this->actingAs($this->admin)->postJson($this->url, [
        'portal' => ['name' => 'test_portal_no_domain', 'slug' => 'test_kbase_no_domain'],
    ])->assertOk()->json();

    expect($payload['custom_domain'])->toBeNull();
});

it('creates a portal when the custom domain is blank', function () {
    $payload = $this->actingAs($this->admin)->postJson($this->url, [
        'portal' => ['name' => 'blank_domain', 'slug' => 'blank_domain', 'custom_domain' => ''],
    ])->assertOk()->json();

    expect($payload['custom_domain'])->toBeNull();
});

// Ràng buộc founder: form không có ô slug — backend tự sinh slug ASCII từ tên.
it('generates an ascii slug from a vietnamese name when none is given', function () {
    $payload = $this->actingAs($this->admin)->postJson($this->url, [
        'portal' => ['name' => 'Trung tâm trợ giúp Yona'],
    ])->assertOk()->json();

    expect($payload['slug'])->toBe('trung-tam-tro-giup-yona');

    $second = $this->actingAs($this->admin)->postJson($this->url, [
        'portal' => ['name' => 'Trung tâm trợ giúp Yona'],
    ])->assertOk()->json();

    expect($second['slug'])->toBe('trung-tam-tro-giup-yona-2');
});

it('updates the portal and reports the locale breakdown', function () {
    $payload = $this->actingAs($this->admin)->putJson($this->url.'/portal-1', [
        'portal' => [
            'name' => 'updated_test_portal',
            'config' => ['allowed_locales' => ['en', 'es'], 'draft_locales' => ['es'], 'default_locale' => 'en'],
        ],
    ])->assertOk()->json();

    expect($payload['name'])->toBe('updated_test_portal')
        ->and($payload['config'])->toBe([
            'allowed_locales' => [
                ['code' => 'en', 'articles_count' => 0, 'categories_count' => 0, 'draft' => false],
                ['code' => 'es', 'articles_count' => 0, 'categories_count' => 0, 'draft' => true],
            ],
            'default_locale' => 'en',
            'layout' => 'classic',
            'social_profiles' => [],
            'locale_translations' => [],
            'popular_content' => [],
            'analytics' => [],
        ]);
});

it('stores the analytics configuration of an administrator', function () {
    $this->actingAs($this->admin)->putJson($this->url.'/portal-1', [
        'portal' => ['config' => ['analytics' => ['ga4_measurement_id' => 'G-ADMIN12345']]],
    ])->assertOk();

    expect($this->portal->refresh()->config['analytics'])->toBe(['ga4_measurement_id' => 'G-ADMIN12345']);
});

it('rejects an analytics configuration with unknown keys', function () {
    $this->actingAs($this->admin)->putJson($this->url.'/portal-1', [
        'portal' => ['config' => ['analytics' => ['unknown_id' => 'x']]],
    ])->assertStatus(422)->assertJson(['error' => 'Invalid analytics configuration']);
});

it('rejects an analytics id that does not match its format', function () {
    $this->actingAs($this->admin)->putJson($this->url.'/portal-1', [
        'portal' => ['config' => ['analytics' => ['ga4_measurement_id' => 'nope']]],
    ])->assertStatus(422);
});

it('preserves drafted locales when draft_locales is omitted', function () {
    $this->portal->update(['config' => ['allowed_locales' => ['en', 'es', 'fr'], 'draft_locales' => ['es'], 'default_locale' => 'en']]);

    $payload = $this->actingAs($this->admin)->putJson($this->url.'/portal-1', [
        'portal' => ['config' => ['allowed_locales' => ['en', 'es', 'fr'], 'default_locale' => 'en']],
    ])->assertOk()->json();

    expect($this->portal->refresh()->draftLocaleCodes())->toBe(['es'])
        ->and(collect($payload['config']['allowed_locales'])->firstWhere('code', 'es')['draft'])->toBeTrue();
});

it('refuses to draft the default locale', function () {
    $this->actingAs($this->admin)->putJson($this->url.'/portal-1', [
        'portal' => ['config' => ['allowed_locales' => ['en', 'es'], 'draft_locales' => ['en'], 'default_locale' => 'en']],
    ])->assertStatus(422)->assertJson(['message' => 'Config default locale cannot be drafted.']);
});

it('archives the portal through update', function () {
    $payload = $this->actingAs($this->admin)->putJson($this->url.'/portal-1', ['portal' => ['archived' => true]])->assertOk()->json();

    expect($payload['archived'])->toBeTrue()
        ->and($this->portal->refresh()->archived)->toBeTrue();
});

it('refuses to associate an inbox of another account', function () {
    $foreign = Inbox::factory()->create();

    $this->actingAs($this->admin)->putJson($this->url.'/portal-1', [
        'portal' => ['name' => 'test_portal'],
        'inbox_id' => $foreign->id,
    ])->assertNotFound();

    expect($this->portal->refresh()->channel_web_widget_id)->toBeNull();
});

it('clears the associated web widget when the inbox selection is blank', function () {
    $channel = WebWidget::factory()->create(['account_id' => $this->account->id]);
    $inbox = Inbox::factory()->create([
        'account_id' => $this->account->id,
        'channel_type' => WebWidget::class,
        'channel_id' => $channel->id,
    ]);
    $this->portal->update(['channel_web_widget_id' => $inbox->channel_id]);

    $payload = $this->actingAs($this->admin)->putJson($this->url.'/portal-1', [
        'portal' => ['name' => 'test_portal'],
        'inbox_id' => '',
    ])->assertOk()->json();

    expect($this->portal->refresh()->channel_web_widget_id)->toBeNull()
        ->and($payload)->not->toHaveKey('inbox');
});

it('deletes the portal', function () {
    $this->actingAs($this->admin)->deleteJson($this->url.'/portal-1')->assertOk();

    expect(Portal::query()->find($this->portal->id))->toBeNull();
});

it('refuses to delete the logo for an agent', function () {
    $this->actingAs($this->agent)->deleteJson($this->url.'/portal-1/logo')->assertUnauthorized();
});

it('requires an email to send the cname instructions', function () {
    $this->actingAs($this->admin)->postJson($this->url.'/portal-1/send_instructions', [])
        ->assertStatus(422)->assertJson(['error' => 'Email is required']);
});

it('rejects a malformed email for the cname instructions', function () {
    $this->actingAs($this->admin)->postJson($this->url.'/portal-1/send_instructions', ['email' => 'invalid-email'])
        ->assertStatus(422)->assertJson(['error' => 'Invalid email format']);
});

it('requires a custom domain before sending the cname instructions', function () {
    $this->actingAs($this->admin)->postJson($this->url.'/portal-1/send_instructions', ['email' => 'dev@example.com'])
        ->assertStatus(422)->assertJson(['error' => 'Custom domain is not configured']);
});

it('sends the cname instructions', function () {
    Notification::fake();
    $this->portal->update(['custom_domain' => 'docs.example.com']);

    $this->actingAs($this->admin)->postJson($this->url.'/portal-1/send_instructions', ['email' => 'dev@example.com'])
        ->assertOk()->assertJson(['message' => 'Instructions sent successfully']);

    Notification::assertSentOnDemand(PortalCnameInstructions::class);
});
