<?php

namespace App\Agent\Inference\Gateway\Drivers;

use App\Agent\Inference\Gateway\Protocol;

// Sổ driver theo giao thức. Thêm giao thức = thêm một driver và một tham số ở đây.
final class ProtocolDrivers
{
    /** @var array<string, ProtocolDriver> */
    private readonly array $byProtocol;

    public function __construct(AnthropicMessagesDriver $anthropicMessages, OpenAiChatDriver $openAiChat)
    {
        $byProtocol = [];

        foreach ([$anthropicMessages, $openAiChat] as $driver) {
            $byProtocol[$driver->protocol()->value] = $driver;
        }

        $this->byProtocol = $byProtocol;
    }

    public function for(Protocol $protocol): ProtocolDriver
    {
        return $this->byProtocol[$protocol->value];
    }
}
