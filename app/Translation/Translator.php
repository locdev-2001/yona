<?php

namespace App\Translation;

use Closure;
use Illuminate\Translation\Translator as BaseTranslator;

/**
 * Chuỗi giao diện trong lang/ giữ nguyên placeholder `{name}` của Chatwoot (vue-i18n)
 * để cùng một file phục vụ cả backend `__()` lẫn bundle frontend; `:name` chuẩn Laravel vẫn chạy.
 */
class Translator extends BaseTranslator
{
    protected function makeReplacements($line, array $replace)
    {
        $line = parent::makeReplacements($line, $replace);

        $bracePlaceholders = [];
        foreach ($replace as $key => $value) {
            if ($value instanceof Closure) {
                continue;
            }
            $bracePlaceholders['{'.$key.'}'] = is_object($value) ? enum_value($value) : $value;
        }

        return $bracePlaceholders === [] ? $line : strtr($line, $bracePlaceholders);
    }
}
