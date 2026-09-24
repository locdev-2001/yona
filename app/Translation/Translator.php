<?php

namespace App\Translation;

use Closure;
use Illuminate\Translation\Translator as BaseTranslator;

/**
 * Chuỗi giao diện trong lang/ dùng placeholder `{name}` để cùng một file phục vụ cả
 * backend `__()` lẫn bundle frontend; `:name` chuẩn Laravel vẫn chạy.
 *
 * Câu nói về chính sản phẩm viết `{installationName}`; tên bản cài đặt được điền sẵn
 * cho mọi lời gọi (nơi gọi truyền tay thì thắng). Phía frontend cùng tên tham số ở
 * INSTALLATION_NAME_PARAM của resources/js/i18n/index.ts.
 */
class Translator extends BaseTranslator
{
    public const INSTALLATION_NAME_PARAM = 'installationName';

    protected function makeReplacements($line, array $replace)
    {
        $replace += [self::INSTALLATION_NAME_PARAM => $this->installationName()];

        $line = parent::makeReplacements($line, $replace);

        $bracePlaceholders = [];
        foreach ($replace as $key => $value) {
            if ($value instanceof Closure) {
                continue;
            }
            $bracePlaceholders['{'.$key.'}'] = is_object($value) ? enum_value($value) : $value;
        }

        return strtr($line, $bracePlaceholders);
    }

    private function installationName(): string
    {
        return (string) config('yona.branding.installation_name', config('app.name'));
    }
}
