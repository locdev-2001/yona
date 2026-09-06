<?php

namespace App\Exceptions;

// Port từ lib/custom_exceptions/custom_filter.rb — bốn lỗi của bộ lọc tuỳ chỉnh.
// Controller bắt và trả 422 {"message": ...} như render_could_not_create_error.
class CustomFilterException extends RecordInvalidException
{
    /** @param array<int, string> $allowedKeys */
    public static function invalidAttribute(string $key, array $allowedKeys): self
    {
        return new self(__('errors.custom_filters.invalid_attribute', [
            'key' => $key,
            'allowed_keys' => implode(',', $allowedKeys),
        ]));
    }

    /** @param array<int, string> $allowedOperators */
    public static function invalidOperator(string $attributeName, array $allowedOperators): self
    {
        return new self(__('errors.custom_filters.invalid_operator', [
            'attribute_name' => $attributeName,
            'allowed_keys' => implode(',', $allowedOperators),
        ]));
    }

    public static function invalidQueryOperator(): self
    {
        return new self(__('errors.custom_filters.invalid_query_operator'));
    }

    public static function invalidValue(string $attributeName): self
    {
        return new self(__('errors.custom_filters.invalid_value', ['attribute_name' => $attributeName]));
    }
}
