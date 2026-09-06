<?php

use App\Models\Inbox;

// Port từ spec/controllers/api/v1/webhooks_controller_spec.rb (twitter_crc).
// Kênh Twitter mới ở mức khung: đăng ký kênh + trả lời CRC.

it('trả response_token đúng cho CRC của Twitter', function () {
    config()->set('services.twitter.consumer_secret', 'twitter-secret');

    $this->getJson('/webhooks/twitter?crc_token=test-token')
        ->assertOk()
        ->assertJson([
            'response_token' => 'sha256='.base64_encode(hash_hmac('sha256', 'test-token', 'twitter-secret', true)),
        ]);
});

it('nhận sự kiện Twitter mà không nổ (khung)', function () {
    $this->postJson('/webhooks/twitter', ['direct_message_events' => []])->assertOk();
});

it('kênh Twitter khai đúng morph type', function () {
    $inbox = Inbox::factory()->twitterProfile()->create();

    expect($inbox->channel_type)->toBe('Channel::TwitterProfile')
        ->and($inbox->channel->tweets_enabled)->toBeTrue();
});
