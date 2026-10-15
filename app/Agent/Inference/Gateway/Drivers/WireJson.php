<?php

namespace App\Agent\Inference\Gateway\Drivers;

use stdClass;

// Mã hoá payload tất định: cùng Prompt → cùng byte. Mảng PHP rỗng mà wire đòi object
// phải thành `{}`, không phải `[]`.
final class WireJson
{
    private const FLAGS = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION | JSON_INVALID_UTF8_SUBSTITUTE;

    // Khoá schema có giá trị là danh sách giá trị, không phải schema con.
    private const SCHEMA_VALUE_KEYS = ['required', 'enum', 'type', 'examples'];

    public static function encode(mixed $value): string
    {
        return (string) json_encode($value, self::FLAGS);
    }

    /** @param array<string, mixed> $values */
    public static function object(array $values): array|stdClass
    {
        return $values === [] ? new stdClass : $values;
    }

    /**
     * JSON Schema chuẩn tắc: khoá object sắp theo tên, schema rỗng thành `{}`.
     *
     * @param  array<int|string, mixed>  $schema
     * @return array<int|string, mixed>|stdClass
     */
    public static function schema(array $schema): array|stdClass
    {
        if ($schema === []) {
            return new stdClass;
        }

        if (array_is_list($schema)) {
            return array_map(fn ($item) => is_array($item) ? self::schema($item) : $item, $schema);
        }

        ksort($schema);

        foreach ($schema as $key => $value) {
            if (is_array($value) && ! in_array($key, self::SCHEMA_VALUE_KEYS, true)) {
                $schema[$key] = self::schema($value);
            }
        }

        return $schema;
    }
}
