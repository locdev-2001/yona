<?php

namespace App\Messaging\Structured;

use App\Exceptions\MessageValidationException;

/** Payload hoặc câu trả lời sai. Kế thừa MessageValidationException để các controller sẵn có trả 422. */
final class InvalidStructuredPayload extends MessageValidationException
{
    public static function because(string $reason, array $replace = []): self
    {
        return new self(__("messaging.errors.{$reason}", $replace));
    }

    public static function notAllowed(string $contentType): self
    {
        return self::because('not_allowed', ['type' => $contentType]);
    }

    public static function notAnswerable(string $contentType): self
    {
        return self::because('not_answerable', ['type' => $contentType]);
    }

    public static function unknownChoice(): self
    {
        return self::because('unknown_choice');
    }
}
