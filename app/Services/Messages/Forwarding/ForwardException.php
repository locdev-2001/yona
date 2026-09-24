<?php

namespace App\Services\Messages\Forwarding;

use RuntimeException;

final class ForwardException extends RuntimeException
{
    public function __construct(public readonly ForwardBlock $block)
    {
        parent::__construct($block->message);
    }
}
