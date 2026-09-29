<?php

use App\Channels\Capability;
use App\Models\Inbox;
use Tests\Contracts\Channels\ChannelContractRunner;
use Tests\Contracts\Channels\Harness\TelegramHarness;

// Kênh mẫu chạy khung contract. Lô Zalo nối vào bằng ZaloHarness + một khối như
// dưới đây; KHÔNG chép lại nội dung contract.
it('Telegram qua đủ các contract của những năng lực nó khai báo', function () {
    $harness = new TelegramHarness(Inbox::factory()->telegram()->create());

    $executed = ChannelContractRunner::runDeclared($harness);

    // Khai báo nào có contract thì phải chạy thật; event_seen không khai nên bị bỏ qua.
    expect($executed)->toBe(['inbound_image', 'outbound_file', 'outbound_reply_to', 'inbound_forward', 'settings_single_conversation'])
        ->and($harness->inbox()->supports(Capability::EventSeen))->toBeFalse();
});
