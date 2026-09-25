<?php

namespace App\Exceptions\Account;

use Exception;

// reason khớp AccountInviteLink::status() (trừ 'active'); message dịch sẵn để
// controller trả thẳng, không phải tự suy luận chuỗi theo reason lần nữa.
class InviteLinkUnusable extends Exception
{
    public function __construct(public readonly string $reason)
    {
        parent::__construct(__("invite_links.accept.errors.{$reason}"));
    }
}
