<?php

namespace App\Agent\Boundary\Inbound;

use App\Events\DomainEvent;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

// Cửa nghe sự kiện duy nhất của agent: lõi không biết agent tồn tại, agent tự đăng ký
// nghe sự kiện miền của lõi.
final class InboundServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Event::listen(DomainEvent::class, [DomainEventListener::class, 'handle']);
    }
}
