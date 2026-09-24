<?php

namespace Tests\Contracts\Channels;

use Tests\Contracts\Channels\Contracts\ChannelContract;
use Tests\Contracts\Channels\Contracts\EventSeenContract;
use Tests\Contracts\Channels\Contracts\InboundImageContract;
use Tests\Contracts\Channels\Contracts\MentionContract;
use Tests\Contracts\Channels\Contracts\OutboundAttachmentsContract;
use Tests\Contracts\Channels\Contracts\ReplyToContract;
use Tests\Contracts\Channels\Harness\ChannelHarness;

/**
 * Chạy đúng những contract mà kênh ĐÃ KHAI BÁO: khai thì phải qua, không khai thì
 * bỏ qua (docs/channel-capabilities.md §1.3–1.4). Đây là chỗ nối duy nhất giữa
 * khai báo năng lực và test — thêm contract chỉ sửa mảng dưới đây.
 *
 * @var list<class-string<ChannelContract>>
 */
final class ChannelContractRunner
{
    public const CONTRACTS = [
        InboundImageContract::class,
        OutboundAttachmentsContract::class,
        ReplyToContract::class,
        MentionContract::class,
        EventSeenContract::class,
    ];

    /** @return list<string> tên các contract đã chạy, để test khẳng định không chạy rỗng. */
    public static function runDeclared(ChannelHarness $harness): array
    {
        $inbox = $harness->inbox();
        $executed = [];

        foreach (self::CONTRACTS as $contract) {
            if (! $inbox->supports($contract::capability())) {
                continue;
            }

            (new $contract)->assert($harness);
            $executed[] = $contract::capability()->value;
        }

        return $executed;
    }
}
