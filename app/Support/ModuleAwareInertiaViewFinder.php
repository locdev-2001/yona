<?php

namespace App\Support;

use Illuminate\View\FileViewFinder;
use InvalidArgumentException;

/**
 * Extends FileViewFinder to resolve Inertia page components for modules.
 *
 * Convention: 'Modules.{Module}.{page/path}' resolves to
 *   modules/{kebab-module}/resources/js/pages/{page/path}.{ext}
 *
 * Non-module names fall through to the standard FileViewFinder logic.
 */
class ModuleAwareInertiaViewFinder extends FileViewFinder
{
    /**
     * Resolve a module-prefixed component name to an absolute file path.
     * Returns null if the name is not a module component.
     */
    private function resolveModulePath(string $name): ?string
    {
        if (! str_starts_with($name, 'Modules.')) {
            return null;
        }

        // 'Modules.Announcements.announcements/index'
        // → module = 'Announcements', page = 'announcements/index'
        $withoutPrefix = substr($name, strlen('Modules.'));
        $dotPos = strpos($withoutPrefix, '.');

        if ($dotPos === false) {
            return null;
        }

        $module = substr($withoutPrefix, 0, $dotPos);         // 'Announcements'
        $page   = substr($withoutPrefix, $dotPos + 1);         // 'announcements/index'
        $kebab  = strtolower(preg_replace('/([A-Z])/', '-$1', lcfirst($module)));

        $base = base_path("modules/{$kebab}/resources/js/pages");

        foreach ($this->extensions as $ext) {
            $candidate = "{$base}/{$page}.{$ext}";
            if ($this->files->exists($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    public function find($view): string
    {
        $modulePath = $this->resolveModulePath($view);

        if ($modulePath !== null) {
            return $modulePath;
        }

        return parent::find($view);
    }
}
