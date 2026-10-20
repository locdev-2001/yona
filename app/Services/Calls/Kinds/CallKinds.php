<?php

namespace App\Services\Calls\Kinds;

use App\Models\Call;
use Illuminate\Contracts\Container\Container;
use InvalidArgumentException;

// Sổ loại cuộc gọi: `calls.kind` → chính sách, dấu vết, bên nghe thay đổi trong phòng của module sở hữu loại đó, đọc từ
// config/calls.php. Lõi chỉ hỏi sổ, không rẽ nhánh theo loại.
final readonly class CallKinds
{
    public function __construct(private Container $container) {}

    public function policyOf(Call $call): CallPolicy
    {
        return $this->container->make($this->entry($call->kind)['policy']);
    }

    public function trailOf(Call $call): ?CallTrail
    {
        $trailClass = $this->entry($call->kind)['trail'] ?? null;

        return $trailClass === null ? null : $this->container->make($trailClass);
    }

    public function presenceObserverOf(Call $call): ?CallPresenceObserver
    {
        $observerClass = $this->entry($call->kind)['presence'] ?? null;

        return $observerClass === null ? null : $this->container->make($observerClass);
    }

    /** @return array{policy: class-string<CallPolicy>, trail?: class-string<CallTrail>|null, presence?: class-string<CallPresenceObserver>|null} */
    private function entry(string $kind): array
    {
        return config('calls.kinds')[$kind] ?? throw new InvalidArgumentException("Unknown call kind [{$kind}]");
    }
}
