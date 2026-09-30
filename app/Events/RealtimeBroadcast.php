<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

// Thay ActionCable.server.broadcast(member, {event, data}) bằng Reverb: kênh
// private tên đúng chuỗi token (pubsub_token hoặc account_{id}),
// event = tên nghiệp vụ, payload = data phẳng (client dùng listenToAll).
// Mọi người nghe đi chung MỘT lượt POST tới Reverb (Pusher nhận tới 100 kênh mỗi
// lượt, broadcaster tự chia lô) thay vì một lượt cho từng người.
final class RealtimeBroadcast implements ShouldBroadcastNow
{
    /** @param list<string> $channelNames */
    public function __construct(
        public readonly array $channelNames,
        public readonly string $eventName,
        public readonly array $data,
    ) {}

    /** @return list<PrivateChannel> */
    public function broadcastOn(): array
    {
        return array_map(fn (string $channelName) => new PrivateChannel($channelName), $this->channelNames);
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
