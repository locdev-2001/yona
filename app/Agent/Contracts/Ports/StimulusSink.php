<?php

namespace App\Agent\Contracts\Ports;

use App\Agent\ValueObjects\Stimulus;

// Boundary giao kích thích cho Runtime qua đây, không import Runtime.
interface StimulusSink
{
    public function accept(Stimulus $stimulus): void;
}
