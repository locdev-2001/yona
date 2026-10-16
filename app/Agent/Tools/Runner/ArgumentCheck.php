<?php

namespace App\Agent\Tools\Runner;

// Kiểm tham số lời gọi công cụ theo đúng tập con JSON Schema các công cụ khai: object với
// properties, required, additionalProperties: false (kể cả object lồng); string (minLength,
// maxLength, enum); integer (minimum, maximum); array (minItems, maxItems, uniqueItems,
// items theo đúng các luật trên). Trả câu mô tả lỗi đầu tiên.
final class ArgumentCheck
{
    /**
     * @param  array<string, mixed>  $schema
     * @param  array<string, mixed>  $args
     */
    public static function violation(array $schema, array $args): ?string
    {
        $properties = (array) ($schema['properties'] ?? []);

        foreach ((array) ($schema['required'] ?? []) as $required) {
            if (! array_key_exists($required, $args) || $args[$required] === null) {
                return "`{$required}` is required.";
            }
        }

        if (($schema['additionalProperties'] ?? true) === false) {
            $unknown = array_diff(array_keys($args), array_keys($properties));

            if ($unknown !== []) {
                return 'Unknown argument(s): '.implode(', ', $unknown).'.';
            }
        }

        foreach ($args as $name => $value) {
            if ($value === null || ! isset($properties[$name])) {
                continue;
            }

            $problem = self::valueViolation((array) $properties[$name], $value);

            if ($problem !== null) {
                return "`{$name}` {$problem}";
            }
        }

        return null;
    }

    /** @param array<string, mixed> $rule */
    private static function valueViolation(array $rule, mixed $value): ?string
    {
        return match ($rule['type'] ?? null) {
            'string' => self::stringViolation($rule, $value),
            'integer' => self::integerViolation($rule, $value),
            'array' => self::arrayViolation($rule, $value),
            'object' => self::objectViolation($rule, $value),
            default => null,
        };
    }

    /** @param array<string, mixed> $rule */
    private static function stringViolation(array $rule, mixed $value): ?string
    {
        if (! is_string($value)) {
            return 'must be a string.';
        }

        $length = mb_strlen(trim($value));

        return match (true) {
            isset($rule['enum']) && ! in_array($value, $rule['enum'], true) => 'must be one of: '.implode(', ', $rule['enum']).'.',
            isset($rule['minLength']) && $length < $rule['minLength'] => "must have at least {$rule['minLength']} characters.",
            isset($rule['maxLength']) && $length > $rule['maxLength'] => "must have at most {$rule['maxLength']} characters.",
            default => null,
        };
    }

    /** @param array<string, mixed> $rule */
    private static function integerViolation(array $rule, mixed $value): ?string
    {
        if (! is_int($value)) {
            return 'must be an integer.';
        }

        return match (true) {
            isset($rule['minimum']) && $value < $rule['minimum'] => "must be at least {$rule['minimum']}.",
            isset($rule['maximum']) && $value > $rule['maximum'] => "must be at most {$rule['maximum']}.",
            default => null,
        };
    }

    /** @param array<string, mixed> $rule */
    private static function arrayViolation(array $rule, mixed $value): ?string
    {
        if (! is_array($value) || ! array_is_list($value)) {
            return 'must be a list.';
        }

        if (isset($rule['minItems']) && count($value) < $rule['minItems']) {
            return "must have at least {$rule['minItems']} items.";
        }

        if (isset($rule['maxItems']) && count($value) > $rule['maxItems']) {
            return "must have at most {$rule['maxItems']} items.";
        }

        if (($rule['uniqueItems'] ?? false) && count(array_unique(array_map(fn (mixed $item) => json_encode($item), $value))) < count($value)) {
            return 'must not repeat an item.';
        }

        foreach ($value as $index => $item) {
            $problem = isset($rule['items']) ? self::valueViolation((array) $rule['items'], $item) : null;

            if ($problem !== null) {
                return 'item '.($index + 1)." {$problem}";
            }
        }

        return null;
    }

    /** @param array<string, mixed> $rule */
    private static function objectViolation(array $rule, mixed $value): ?string
    {
        if (! is_array($value) || ($value !== [] && array_is_list($value))) {
            return 'must be an object.';
        }

        $problem = self::violation($rule, $value);

        return $problem === null ? null : "→ {$problem}";
    }
}
