<?php

namespace App\Services\Calls\Media;

// Vai cấp vé vào phòng kèm quyền phát/nghe.
interface MediaTickets
{
    public function issue(TicketRequest $request): JoinTicket;
}
