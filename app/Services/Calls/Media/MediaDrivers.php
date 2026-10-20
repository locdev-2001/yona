<?php

namespace App\Services\Calls\Media;

use Illuminate\Contracts\Container\Container;
use InvalidArgumentException;

// Sổ driver media: tên nhà cung cấp → driver, đọc từ config/calls.php.
final class MediaDrivers
{
    public function __construct(private readonly Container $container) {}

    public function default(): MediaDriver
    {
        return $this->named((string) config('calls.provider'));
    }

    public function defaultIsConfigured(): bool
    {
        $driverClass = config('calls.drivers')[(string) config('calls.provider')] ?? null;

        return $driverClass !== null && $driverClass::isConfigured();
    }

    public function has(string $provider): bool
    {
        return isset(config('calls.drivers')[$provider]);
    }

    public function named(string $provider): MediaDriver
    {
        $driverClass = config('calls.drivers')[$provider] ?? throw new InvalidArgumentException("Unknown media provider [{$provider}]");

        return $this->container->make($driverClass);
    }
}
