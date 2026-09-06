<?php

namespace App\Support\Integrations;

// Thay cho gem JSONSchemer của Chatwoot: kiểm một giá trị theo lược đồ JSON Schema
// khai trong config/integration/apps.php và lược đồ nội dung của dashboard app.
// Chỉ hiện thực đúng các từ khoá mà các lược đồ đó dùng — thêm từ khoá mới thì
// bổ sung ở đây, không rải điều kiện theo từng app.
final class JsonSchemaValidator
{
    public static function isValid(mixed $value, array $schema, array $definitions = []): bool
    {
        $definitions = $schema['definitions'] ?? $definitions;

        if (isset($schema['$ref'])) {
            $referenced = self::resolveReference($schema['$ref'], $definitions);

            return $referenced === null || self::isValid($value, $referenced, $definitions);
        }

        return match ($schema['type'] ?? null) {
            'object' => self::isValidObject($value, $schema, $definitions),
            'array' => self::isValidArray($value, $schema, $definitions),
            'string' => is_string($value) && self::matchesStringRules($value, $schema),
            'boolean' => is_bool($value),
            'number' => is_int($value) || is_float($value),
            'integer' => is_int($value),
            default => self::matchesUntyped($value, $schema),
        };
    }

    private static function isValidObject(mixed $value, array $schema, array $definitions): bool
    {
        if (! is_array($value) || (array_is_list($value) && $value !== [])) {
            return false;
        }

        foreach ($schema['required'] ?? [] as $property) {
            if (! array_key_exists($property, $value) || $value[$property] === null || $value[$property] === '') {
                return false;
            }
        }

        $properties = $schema['properties'] ?? [];

        foreach ($value as $key => $item) {
            if (! isset($properties[$key])) {
                if (($schema['additionalProperties'] ?? true) === false) {
                    return false;
                }

                continue;
            }

            if (! self::isValid($item, $properties[$key], $definitions)) {
                return false;
            }
        }

        return true;
    }

    private static function isValidArray(mixed $value, array $schema, array $definitions): bool
    {
        if (! is_array($value) || ! array_is_list($value)) {
            return false;
        }

        if (count($value) < ($schema['minItems'] ?? 0)) {
            return false;
        }

        $itemSchema = $schema['items'] ?? null;

        if ($itemSchema === null) {
            return true;
        }

        foreach ($value as $item) {
            if (! self::isValid($item, $itemSchema, $definitions)) {
                return false;
            }
        }

        return true;
    }

    private static function matchesStringRules(string $value, array $schema): bool
    {
        if (isset($schema['pattern']) && ! preg_match('#'.$schema['pattern'].'#', $value)) {
            return false;
        }

        return self::matchesEnum($value, $schema);
    }

    // Lược đồ không khai `type` (ví dụ `{"enum": ["frame"]}` hoặc `$ref` tới
    // saneUrl chỉ có `pattern`): vẫn phải áp `pattern` + `enum`.
    private static function matchesUntyped(mixed $value, array $schema): bool
    {
        if (isset($schema['pattern'])) {
            return is_string($value) && self::matchesStringRules($value, $schema);
        }

        return self::matchesEnum($value, $schema);
    }

    private static function matchesEnum(mixed $value, array $schema): bool
    {
        $enum = $schema['enum'] ?? null;

        return $enum === null || in_array($value, $enum, true);
    }

    private static function resolveReference(string $reference, array $definitions): ?array
    {
        $name = str_replace('#/definitions/', '', $reference);

        return $definitions[$name] ?? null;
    }
}
