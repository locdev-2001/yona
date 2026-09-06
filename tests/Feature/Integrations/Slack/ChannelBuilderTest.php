<?php

use App\Models\Integrations\Hook;
use App\Services\Integrations\Slack\ChannelBuilder;
use Illuminate\Support\Facades\Http;

// Port từ lib/integrations/slack/channel_builder.rb (không có spec riêng ở bản
// gốc — hành vi được phủ qua slack_controller_spec / slack_request_spec).

it('gộp kênh private và public, phân trang public bằng cursor', function () {
    $hook = Hook::factory()->create(['access_token' => 'xoxb-token']);

    Http::fake([
        'https://slack.com/api/conversations.list*' => Http::sequence()
            ->push(['ok' => true, 'channels' => [['id' => 'G1', 'name' => 'private-1', 'is_private' => true]], 'response_metadata' => ['next_cursor' => '']])
            ->push(['ok' => true, 'channels' => [['id' => 'C1', 'name' => 'general', 'is_private' => false]], 'response_metadata' => ['next_cursor' => 'abc']])
            ->push(['ok' => true, 'channels' => [['id' => 'C2', 'name' => 'random', 'is_private' => false]], 'response_metadata' => ['next_cursor' => '']]),
    ]);

    $channels = (new ChannelBuilder($hook))->fetchChannels();

    expect(collect($channels)->pluck('id')->all())->toBe(['G1', 'C1', 'C2']);
});

it('cập nhật reference_id, tên kênh và bật hook khi kênh public — có join', function () {
    $hook = Hook::factory()->create(['access_token' => 'xoxb-token', 'status' => Hook::STATUS_DISABLED]);

    Http::fake([
        'https://slack.com/api/conversations.list*' => Http::response([
            'ok' => true,
            'channels' => [['id' => 'C1', 'name' => 'general', 'is_private' => false]],
            'response_metadata' => ['next_cursor' => ''],
        ]),
        'https://slack.com/api/conversations.join' => Http::response(['ok' => true]),
    ]);

    $updated = (new ChannelBuilder($hook))->update('C1');

    expect($updated->reference_id)->toBe('C1')
        ->and($updated->settings)->toBe(['channel_name' => 'general'])
        ->and($updated->isEnabled())->toBeTrue();

    Http::assertSent(fn ($request) => str_contains($request->url(), 'conversations.join'));
});

it('không join khi kênh private, vẫn cập nhật hook', function () {
    $hook = Hook::factory()->create(['access_token' => 'xoxb-token']);

    Http::fake([
        'https://slack.com/api/conversations.list*' => Http::response([
            'ok' => true,
            'channels' => [['id' => 'G1', 'name' => 'secret', 'is_private' => true]],
            'response_metadata' => ['next_cursor' => ''],
        ]),
    ]);

    $updated = (new ChannelBuilder($hook))->update('G1');

    expect($updated->reference_id)->toBe('G1');

    Http::assertNotSent(fn ($request) => str_contains($request->url(), 'conversations.join'));
});

it('trả null khi channel_id không khớp kênh nào', function () {
    $hook = Hook::factory()->create(['access_token' => 'xoxb-token']);

    Http::fake([
        'https://slack.com/api/conversations.list*' => Http::response([
            'ok' => true,
            'channels' => [],
            'response_metadata' => ['next_cursor' => ''],
        ]),
    ]);

    expect((new ChannelBuilder($hook))->update('unknown'))->toBeNull();
});
