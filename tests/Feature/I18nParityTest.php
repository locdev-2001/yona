<?php

use Illuminate\Support\Arr;

/**
 * Guards the i18n contract that keeps breaking in practice:
 * 1. every locale exposes the SAME namespace files, and
 * 2. every flattened key in one locale exists in the other.
 * A missing key surfaces as a raw "namespace.key" string in the UI
 * (useTranslator falls back to the key), so parity drift is a real bug.
 */
function flattenLang(string $locale): array
{
    $keys = [];

    foreach (glob(lang_path($locale.'/*.php')) ?: [] as $file) {
        $namespace = basename($file, '.php');
        foreach (Arr::dot(require $file) as $key => $value) {
            $keys[] = $namespace.'.'.$key;
        }
    }

    sort($keys);

    return $keys;
}

it('exposes the same namespace files for every locale', function () {
    $en = array_map(fn ($f) => basename($f), glob(lang_path('en/*.php')) ?: []);
    $vi = array_map(fn ($f) => basename($f), glob(lang_path('vi/*.php')) ?: []);

    sort($en);
    sort($vi);

    expect($vi)->toBe($en);
});

it('has identical flattened keys across en and vi', function () {
    $en = flattenLang('en');
    $vi = flattenLang('vi');

    expect(array_diff($en, $vi))->toBe([], 'Keys present in en but missing in vi');
    expect(array_diff($vi, $en))->toBe([], 'Keys present in vi but missing in en');
});

it('resolves the nav + search keys the CRM sidebar and list pages depend on', function () {
    $required = [
        'platform.actions.search',
        'platform.nav.overview',
        'platform.nav.crm',
        'platform.nav.clients',
        'platform.nav.leads',
        'platform.nav.projects',
        'platform.nav.tasks',
        'clients.empty',
        'clients.actions.delete_confirm',
        'clients.vault.empty',
        'activity.empty',
        'common.prev',
        'common.next',
    ];

    foreach (['en', 'vi'] as $locale) {
        app()->setLocale($locale);
        foreach ($required as $key) {
            expect(trans($key))->not->toBe($key, "[$locale] missing translation for {$key}");
        }
    }
});
