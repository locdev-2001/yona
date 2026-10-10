<?php

use App\Channels\Capability;
use App\Models\Inbox;
use Tests\Contracts\Channels\ChannelContractRunner;
use Tests\Contracts\Channels\Harness\FacebookHarness;
use Tests\Contracts\Channels\Harness\TelegramHarness;

// Kênh mẫu chạy khung contract. Lô Zalo nối vào bằng ZaloHarness + một khối như
// dưới đây; KHÔNG chép lại nội dung contract.
it('Telegram qua đủ các contract của những năng lực nó khai báo', function () {
    $harness = new TelegramHarness(Inbox::factory()->telegram()->create());

    $executed = ChannelContractRunner::runDeclared($harness);

    // Khai báo nào có contract thì phải chạy thật; event_seen không khai nên bị bỏ qua.
    expect($executed)->toBe(['inbound_image', 'inbound_sticker', 'inbound_file', 'inbound_video', 'inbound_audio', 'inbound_location', 'inbound_contact_card', 'inbound_reply_to', 'inbound_forward', 'outbound_file', 'outbound_reply_to', 'settings_single_conversation'])
        ->and($harness->inbox()->supports(Capability::EventSeen))->toBeFalse();
});

it('Messenger qua đủ các contract của những năng lực nó khai báo', function () {
    $harness = new FacebookHarness(Inbox::factory()->facebookPage()->create());

    $executed = ChannelContractRunner::runDeclared($harness);

    expect($executed)->toContain('inbound_sticker', 'inbound_reply_to', 'event_delivered', 'event_seen', 'event_reaction');
});
