<?php

namespace Modules\Sample\Contracts;

/**
 * Demo contract for F10 no-op default binding pattern.
 *
 * Pattern: consumer (SampleServiceProvider) binds NoOpSampleGreeter by default.
 * A hypothetical provider module (depends:['sample']) would override with a real
 * implementation — because topo-sort ensures provider registers AFTER consumer.
 * Disabling the provider → consumer's no-op survives, app doesn't break.
 */
interface SampleGreeter
{
    public function greet(string $name): string;
}
