<?php

namespace App\Events;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Events\Dispatchable;

// Port từ refs/chatwoot/lib/events/base.rb + Dispatcher.dispatch: một event
// duy nhất mang định danh (EventType) + payload; listener rẽ nhánh theo
// methodName() như Wisper publish(event.method_name).
final class DomainEvent
{
    use Dispatchable;

    public function __construct(
        public readonly EventType $type,
        public readonly array $data = [],
        public readonly ?CarbonImmutable $timestamp = null,
    ) {}

    public function methodName(): string
    {
        return $this->type->methodName();
    }
}
