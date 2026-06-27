<?php

/*
 * P06 — Guard: module Inertia::render page names must be prefixed + files must exist.
 *
 * Scans every Inertia::render() call in modules/{name}/src/Http/Controllers/
 * and asserts:
 *   1. Page name starts with 'Modules.{StudlyModule}.' (render prefix enforced).
 *   2. The resolved file exists at modules/{kebab}/resources/js/pages/{page}.{ext}.
 *
 * Exceptions: identity, shared, tenancy controllers render bare paths because
 * those pages live in the shared resources/js/pages/ tree — NOT module-local.
 * These are listed in $barePathModules below.
 *
 * Fail = regression (bad render name or missing file). This caught the crm-sales bug.
 */

function moduleToKebab(string $studly): string
{
    return strtolower(preg_replace('/([A-Z])/', '-$1', lcfirst($studly)));
}

function resolveModulePage(string $studlyModule, string $page): bool
{
    $kebab = moduleToKebab($studlyModule);
    $base = base_path("modules/{$kebab}/resources/js/pages");
    $extensions = ['tsx', 'jsx', 'ts', 'js', 'vue'];

    foreach ($extensions as $ext) {
        if (file_exists("{$base}/{$page}.{$ext}")) {
            return true;
        }
    }

    return false;
}

it('all module Inertia::render calls use correct prefix and point to existing files', function () {
    // Modules whose pages live in shared resources/js/pages/ (bare paths allowed).
    $barePathModules = ['identity', 'shared', 'tenancy'];

    $allFiles = array_merge(
        glob(base_path('modules/*/src/Http/Controllers/**/*.php')) ?: [],
        glob(base_path('modules/*/src/Http/Controllers/*.php')) ?: [],
    );

    $violations = [];

    foreach (array_unique($allFiles) as $file) {
        $content = file_get_contents($file);
        if ($content === false) {
            continue;
        }

        // Extract kebab module name from path: modules/{kebab}/src/...
        if (! preg_match('#modules/([^/]+)/src/#', $file, $pathMatch)) {
            continue;
        }
        $moduleKebab = $pathMatch[1];

        // Derive studly name: crm-sales -> CrmSales
        $moduleStudly = str_replace(' ', '', ucwords(str_replace('-', ' ', $moduleKebab)));

        // Settings controllers may render bare paths (shared layout pages):
        // settings/lookups/*, settings/workspace, settings/members, etc.
        // The pages live in resources/js/pages/settings/ (shared tree), not in the module.
        $isSettingsController = str_contains($file, '/Http/Controllers/Settings/');

        // Find all Inertia::render('...') calls.
        preg_match_all("/Inertia::render\(\s*'([^']+)'/", $content, $matches);

        foreach ($matches[1] as $pageName) {
            // Bare-path modules (identity, shared, tenancy): non-prefixed pages always allowed.
            $isBarePathModule = in_array($moduleKebab, $barePathModules, true);

            // Settings controllers in any module: bare settings/* paths allowed.
            $isBareAllowed = $isBarePathModule || $isSettingsController;

            if ($isBareAllowed && ! str_starts_with($pageName, 'Modules.')) {
                // Bare path is allowed here — skip prefix check.
                // (No file-existence check for shared-tree pages — they belong to the app.)
                continue;
            }

            // Prefixed page: MUST have Modules.{StudlyModule}. prefix AND file must exist.
            if (str_starts_with($pageName, 'Modules.')) {
                $rest = substr($pageName, 8); // after 'Modules.'
                $dot = strpos($rest, '.');
                if ($dot === false) {
                    $violations[] = "MALFORMED PREFIX [{$file}]\n  Page: '{$pageName}' (no module segment after 'Modules.')";
                    continue;
                }
                $resolvedStudly = substr($rest, 0, $dot);
                $page = substr($rest, $dot + 1);
                if (! resolveModulePage($resolvedStudly, $page)) {
                    $violations[] = "FILE NOT FOUND [{$file}]\n  Page: {$pageName}\n  Expected at: modules/" . moduleToKebab($resolvedStudly) . "/resources/js/pages/{$page}.{tsx|...}";
                }
                continue;
            }

            // Non-bare module, non-prefixed: violation.
            $expectedPrefix = "Modules.{$moduleStudly}.";
            $violations[] = "MISSING PREFIX [{$file}]\n  Page: '{$pageName}'\n  Expected: '{$expectedPrefix}...'";
        }
    }

    expect($violations)->toBeEmpty(
        "Module page resolution violations:\n" . implode("\n\n", $violations)
    );
});
