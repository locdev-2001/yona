<?php

namespace App\Agent\ValueObjects;

final readonly class TextBlock
{
    public function __construct(public string $text) {}
}
