<?php

namespace App\Support;

use Illuminate\Http\Request;

final class LocaleOptions
{
    /** @return list<array{code: string, label: string, url: string}> */
    public static function forRequest(Request $request): array
    {
        return array_map(fn (array $locale) => [
            'code' => $locale['iso_639_1_code'],
            'label' => $locale['name'],
            'url' => $request->fullUrlWithQuery(['locale' => $locale['iso_639_1_code']]),
        ], config('yona.available_locales', []));
    }
}
