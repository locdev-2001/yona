<?php

namespace App\Support;

final class LandingPrerender
{
    public static function html(array $config): string
    {
        $artifactPath = public_path('build/landing-prerender.json');

        if (is_file(public_path('hot')) || ! is_file($artifactPath)) {
            return '';
        }

        if (! in_array($config['page'], ['home', 'zalo_personal', 'demo', 'demo_thanks'], true)) {
            return '';
        }

        $artifact = json_decode(file_get_contents($artifactPath), true);

        if (($artifact['version'] ?? null) !== 1
            || ($artifact['localeCodes'] ?? []) !== array_column($config['locales'], 'code')) {
            return '';
        }

        $template = $artifact['templates'][$config['locale']][$config['isAuthenticated'] ? 'authenticated' : 'guest'] ?? null;

        if (! is_string($template)) {
            return '';
        }

        $replacements = [];

        foreach ($artifact['placeholders'] as $marker => $path) {
            $replacements[$marker] = e((string) data_get($config, $path));
        }

        return strtr($template, $replacements);
    }
}
