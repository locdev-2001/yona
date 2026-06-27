<?php

namespace Modules\Sample;

use Modules\Sample\Contracts\SampleGreeter;

/**
 * No-op default implementation of SampleGreeter.
 *
 * Bound by SampleServiceProvider as the default. If no provider module
 * overrides this binding, the contract resolves to a safe no-op value.
 * Never throws — always returns something harmless.
 *
 * ponytail: this no-op exists to prove F10 pattern; remove when a real
 * SampleGreeter implementation is needed in a dependent module.
 */
final class NoOpSampleGreeter implements SampleGreeter
{
    public function greet(string $name): string
    {
        return ''; // no-op: safe empty value, does not throw
    }
}
