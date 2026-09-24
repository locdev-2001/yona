<?php

use App\Channels\Capability;
use App\Models\Inbox;
use Tests\Contracts\Channels\ChannelContractRunner;
use Tests\Contracts\Channels\Harness\ZaloHarness;

// docs/channel-capabilities.md §3: kênh khai năng lực nào thì phải QUA contract của
// năng lực đó. Nội dung contract viết một lần ở tests/Contracts/Channels/Contracts;
// ở đây chỉ cắm harness của Zalo vào.
it('Zalo qua đủ các contract của những năng lực nó khai báo', function () {
    $harness = new ZaloHarness(Inbox::factory()->zalo()->create());

    $executed = ChannelContractRunner::runDeclared($harness);

    expect($executed)->toBe(['inbound_image', 'outbound_file', 'outbound_reply_to', 'outbound_mention', 'event_seen', 'outbound_sticker']);
});

it('khai đúng những năng lực lô 3 và lô 4 vừa làm chạy được', function () {
    $inbox = Inbox::factory()->zalo()->create();

    expect($inbox->supports(Capability::OutboundImage))->toBeTrue()
        ->and($inbox->supports(Capability::OutboundRetry))->toBeTrue()
        ->and($inbox->supports(Capability::OutboundReaction))->toBeTrue()
        ->and($inbox->supports(Capability::OutboundRecall))->toBeTrue()
        ->and($inbox->supports(Capability::OutboundTyping))->toBeTrue()
        ->and($inbox->supports(Capability::EventTyping))->toBeTrue()
        // Lô 2b: tin nhóm (Q3) + lời mời kết bạn (Q7) đã có đường thực thi ở driver.
        ->and($inbox->supports(Capability::GroupThreads))->toBeTrue()
        ->and($inbox->supports(Capability::FriendRequest))->toBeTrue()
        // Nhắc tên thành viên khi trả lời trong nhóm (neo ở lõi, gửi mentionInfo qua bridge).
        ->and($inbox->supports(Capability::OutboundMention))->toBeTrue()
        // Nợ có tên, chưa có đường thực thi: không được khai bừa.
        ->and($inbox->supports(Capability::OutboundEdit))->toBeFalse()
        // Lô 6 làm xong hành động ngắt kết nối/đổi tài khoản + đăng xuất bridge khi xoá hộp thư.
        ->and($inbox->supports(Capability::SessionDisconnect))->toBeTrue();
});
