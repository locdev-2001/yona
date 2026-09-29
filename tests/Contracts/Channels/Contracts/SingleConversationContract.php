<?php

namespace Tests\Contracts\Channels\Contracts;

use App\Channels\Capability;
use App\Models\Conversation;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/**
 * §2.6 settings_single_conversation — khai năng lực này thì trang cài đặt hiện mục
 * "Điều hướng hội thoại", nên tin đến của kênh PHẢI đi theo cấu hình đó: tắt thì
 * khách nhắn lại sau khi hội thoại đã xong mở hội thoại mới, bật thì vào lại hội thoại cũ.
 */
final class SingleConversationContract extends ChannelContract
{
    public static function capability(): Capability
    {
        return Capability::SettingsSingleConversation;
    }

    public function assert(ChannelHarness $harness): void
    {
        $inbox = $harness->inbox();

        $inbox->update(['lock_to_single_conversation' => false]);
        $resolved = $this->resolve($harness->receiveInbound(Capability::InboundText)->conversation);
        $afterResolvedUnlocked = $harness->receiveInbound(Capability::InboundText)->conversation;

        expect($afterResolvedUnlocked->id)->not->toBe($resolved->id, 'Tắt "Điều hướng hội thoại" mà tin mới vẫn vào hội thoại đã xong');

        $inbox->update(['lock_to_single_conversation' => true]);
        $locked = $this->resolve($afterResolvedUnlocked);
        $afterResolvedLocked = $harness->receiveInbound(Capability::InboundText)->conversation;

        expect($afterResolvedLocked->id)->toBe($locked->id, 'Bật "Điều hướng hội thoại" mà tin mới vẫn mở hội thoại khác');
    }

    private function resolve(Conversation $conversation): Conversation
    {
        $conversation->update(['status' => Conversation::STATUS_RESOLVED]);

        return $conversation;
    }
}
