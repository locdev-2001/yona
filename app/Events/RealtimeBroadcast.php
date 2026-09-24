<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

// Thay ActionCable.server.broadcast(member, {event, data}) bằng Reverb: kênh
// private tên đúng chuỗi token (pubsub_token hoặc account_{id}),
// event = tên nghiệp vụ, payload = data phẳng (client dùng listenToAll).
final class RealtimeBroadcast implements ShouldBroadcastNow
{
    public function __construct(
        public readonly string $channelName,
        public readonly string $eventName,
        public readonly array $data,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel($this->channelName);
    }

    public function broadcastAs(): string
    {
        return $this->eventName;
    }

    public function broadcastWith(): array
    {
        return $this->data;
    }
}
