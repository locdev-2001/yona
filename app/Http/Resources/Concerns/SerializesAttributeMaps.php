<?php

namespace App\Http\Resources\Concerns;

use stdClass;

/**
 * Ruby serialize hash rỗng thành `{}`; mảng PHP rỗng lại thành `[]`.
 * Mọi resource emit `custom_attributes` / `additional_attributes` đi qua đây
 * để hình dạng JSON khớp bản gốc.
 */
trait SerializesAttributeMaps
{
    protected static function attributeMap(mixed $attributes): stdClass
    {
        return (object) ((array) ($attributes ?? []));
    }
}
