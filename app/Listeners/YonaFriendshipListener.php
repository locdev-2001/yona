<?php

namespace App\Listeners;

use App\Events\DomainEvent;
use App\Events\EventType;
use App\Models\Friendship;
use App\Services\Users\PersonalAccounts;
use App\Services\Yona\YonaRelay;

// Hai người vừa thành bạn bè: mỗi bên có người kia trong hộp thư Yona của mình, để
// danh sách Bạn bè hiện ngay mà không cần ai nhắn trước.
class YonaFriendshipListener
{
    public function __construct(
        private readonly YonaRelay $relay,
        private readonly PersonalAccounts $accounts,
    ) {}

    public function handle(DomainEvent $event): void
    {
        if ($event->type !== EventType::FRIENDSHIP_ACCEPTED) {
            return;
        }

        /** @var Friendship $friendship */
        $friendship = $event->data['friendship'];
        [$requester, $addressee] = [$friendship->requester, $friendship->addressee];

        $this->relay->contactFor($this->accounts->ensureFor($requester), $addressee);
        $this->relay->contactFor($this->accounts->ensureFor($addressee), $requester);
    }
}
