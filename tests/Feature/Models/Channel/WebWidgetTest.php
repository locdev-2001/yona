<?php

use App\Models\Account;
use App\Models\Channel\WebWidget;
use App\Models\Inbox;

// Port từ spec/models/channel/web_widget_spec.rb, cộng phần hành vi mà bản gốc
// mượn gem (FlagShihTzu cho bitmask, has_secure_token cho website/hmac token).

it('fills the default pre chat options', function () {
    $widget = WebWidget::factory()->create();

    expect($widget->pre_chat_form_options['pre_chat_message'])->toBe('Share your queries or comments here.')
        ->and($widget->pre_chat_form_options['pre_chat_fields'])->toHaveCount(3)
        ->and(collect($widget->pre_chat_form_options['pre_chat_fields'])->pluck('name')->all())
        ->toBe(['emailAddress', 'fullName', 'phoneNumber']);
});

it('keeps pre chat fields provided by the caller', function () {
    $fields = [['field_type' => 'standard', 'label' => 'Email Id', 'name' => 'emailAddress', 'type' => 'email', 'required' => true, 'enabled' => true]];

    $widget = WebWidget::factory()->create([
        'pre_chat_form_options' => ['pre_chat_message' => 'Hi there', 'pre_chat_fields' => $fields],
    ]);

    expect($widget->pre_chat_form_options['pre_chat_message'])->toBe('Hi there')
        ->and($widget->pre_chat_form_options['pre_chat_fields'])->toHaveCount(1);
});

it('restores the defaults when pre chat fields are emptied', function () {
    $widget = WebWidget::factory()->create();

    $widget->update(['pre_chat_form_options' => ['pre_chat_message' => 'Hi']]);

    expect($widget->pre_chat_form_options['pre_chat_fields'])->toHaveCount(3);
});

it('enables attachments, emoji picker and end conversation by default', function () {
    $widget = WebWidget::factory()->create();

    expect($widget->feature_flags)->toBe(7)
        ->and($widget->selected_feature_flags)->toBe(['attachments', 'emoji_picker', 'end_conversation']);
});

it('maps selected feature flags to the bitmask column', function (array $flags, int $bitmask) {
    $widget = WebWidget::factory()->create(['selected_feature_flags' => $flags]);

    expect($widget->feature_flags)->toBe($bitmask)
        ->and($widget->refresh()->selected_feature_flags)->toBe($flags);
})->with([
    'none' => [[], 0],
    'attachments only' => [['attachments'], 1],
    'emoji picker only' => [['emoji_picker'], 2],
    'end conversation only' => [['end_conversation'], 4],
    'inbox avatar for bot only' => [['use_inbox_avatar_for_bot'], 8],
    'mobile webview only' => [['allow_mobile_webview'], 16],
    'all flags' => [['attachments', 'emoji_picker', 'end_conversation', 'use_inbox_avatar_for_bot', 'allow_mobile_webview'], 31],
]);

it('clears every flag when the form sends a blank entry', function () {
    $widget = WebWidget::factory()->create();

    $widget->update(['selected_feature_flags' => ['']]);

    expect($widget->refresh()->feature_flags)->toBe(0)
        ->and($widget->selected_feature_flags)->toBe([]);
});

it('clears every flag when selected feature flags is null', function () {
    $widget = WebWidget::factory()->create();

    $widget->update(['selected_feature_flags' => null]);

    expect($widget->refresh()->feature_flags)->toBe(0);
});

it('ignores unknown feature flags', function () {
    $widget = WebWidget::factory()->create(['selected_feature_flags' => ['attachments', 'teleportation']]);

    expect($widget->feature_flags)->toBe(1);
});

it('generates a unique website token and hmac token on create', function () {
    $first = WebWidget::factory()->create();
    $second = WebWidget::factory()->create();

    expect($first->website_token)->toHaveLength(24)
        ->and($first->hmac_token)->toHaveLength(24)
        ->and($first->website_token)->not->toBe($second->website_token)
        ->and($first->hmac_token)->not->toBe($second->hmac_token);
});

it('keeps the tokens given by the caller', function () {
    $widget = WebWidget::factory()->create();
    $token = $widget->website_token;

    $widget->update(['website_url' => 'https://other.test']);

    expect($widget->refresh()->website_token)->toBe($token);
});

it('reads and writes reply time with the rails enum keys', function () {
    $widget = WebWidget::factory()->create();

    expect($widget->reply_time)->toBe('in_a_few_minutes');

    $widget->update(['reply_time' => 'in_a_day']);

    expect($widget->refresh()->reply_time)->toBe('in_a_day')
        ->and($widget->getRawOriginal('reply_time'))->toBe(2);
});

it('names the channel Website', function () {
    expect(WebWidget::factory()->create()->name())->toBe('Website');
});

it('renders the embed script with the website token and the app url', function () {
    $widget = WebWidget::factory()->create();

    $script = $widget->web_widget_script;

    expect($script)->toStartWith("\n    <script>")
        ->and($script)->toContain('var BASE_URL="'.config('app.url').'";')
        ->and($script)->toContain("websiteToken: '{$widget->website_token}',")
        ->and($script)->toContain('g.src=BASE_URL+"/packs/js/sdk.js";')
        ->and($script)->toEndWith("    </script>\n    ");
});

it('deletes the widget channel along with its inbox', function () {
    $account = Account::factory()->create();
    $inbox = Inbox::factory()->webWidget()->create(['account_id' => $account->id]);
    $channelId = $inbox->channel_id;

    $inbox->delete();

    expect(WebWidget::query()->find($channelId))->toBeNull();
});
