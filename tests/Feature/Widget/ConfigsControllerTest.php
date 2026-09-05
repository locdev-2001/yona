<?php

use App\Models\Account;
use App\Models\Contact;
use App\Support\WidgetTokenService;
use Tests\Support\WidgetSession;

// Port từ spec/controllers/api/v1/widget/configs_controller_spec.rb.

it('returns not found with an invalid website token', function () {
    WidgetSession::make();

    $this->postJson('/api/v1/widget/config', ['website_token' => ''])->assertNotFound();
});

it('returns widget config along with a new contact when X-Auth-Token is missing', function () {
    $session = WidgetSession::make();
    $before = Contact::query()->count();

    $response = $this->postJson($session->url('config'))->assertOk();

    expect(Contact::query()->count())->toBe($before + 1);
    expect(array_keys($response->json()))->toEqualCanonicalizing(['website_channel_config', 'contact', 'global_config']);
});

it('returns widget config along with the same contact for a valid X-Auth-Token', function () {
    $session = WidgetSession::make();
    $before = Contact::query()->count();

    $response = $this->postJson($session->url('config'), [], $session->headers())->assertOk();

    expect(Contact::query()->count())->toBe($before);
    expect($response->json('contact.pubsub_token'))->toBe($session->contactInbox->pubsub_token);
    expect($response->json('contact.id'))->toBe($session->contact->id);
});

it('returns unauthorized when the account is suspended', function () {
    $session = WidgetSession::make();
    $session->account->update(['status' => Account::STATUS_SUSPENDED]);

    $this->postJson($session->url('config'), [], $session->headers())
        ->assertUnauthorized()
        ->assertJson(['error' => 'Account is suspended']);
});

it('creates a new contact when X-Auth-Token is invalid', function () {
    $session = WidgetSession::make();
    $before = Contact::query()->count();

    $response = $this->postJson($session->url('config'), [], ['X-Auth-Token' => 'invalid token'])->assertOk();

    expect(Contact::query()->count())->toBe($before + 1);
    expect($response->json('contact.id'))->not->toBe($session->contact->id);
});

it('returns the channel config, branding and a usable session token', function () {
    $session = WidgetSession::make(['welcome_title' => 'Hi there', 'widget_color' => '#009CE0']);

    $config = $this->postJson($session->url('config'), [], $session->headers())->assertOk()->json();

    expect($config['website_channel_config'])->toMatchArray([
        'website_token' => $session->channel->website_token,
        'website_name' => $session->inbox->name,
        'welcome_title' => 'Hi there',
        'widget_color' => '#009CE0',
        'reply_time' => 'in_a_few_minutes',
        'pre_chat_form_enabled' => false,
        'enabled_features' => ['attachments', 'emoji_picker', 'end_conversation'],
        'locale' => 'en',
        'api_host' => config('app.url'),
        'portal' => null,
        'working_hours' => [],
    ]);

    expect($config['global_config'])->toBe([
        'LOGO_THUMBNAIL' => config('yona.branding.logo_thumbnail'),
        'BRAND_NAME' => config('yona.branding.brand_name'),
        'WIDGET_BRAND_URL' => config('yona.branding.widget_brand_url'),
        'MAXIMUM_FILE_UPLOAD_SIZE' => config('limits.maximum_file_upload_size'),
        'INSTALLATION_NAME' => config('yona.branding.installation_name'),
    ]);

    expect(WidgetTokenService::decode($config['website_channel_config']['auth_token']))
        ->toMatchArray(['source_id' => $session->contactInbox->source_id, 'inbox_id' => $session->inbox->id]);
});
