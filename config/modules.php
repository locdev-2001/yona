<?php

return [
    /*
     * Per-module enabled overrides — for tests and local dev only.
     * Format: ['module-name' => true|false]
     *
     * Overrides the `enabled` field in each module.json without touching disk.
     * Usage in tests:
     *   config(['modules.enabled_overrides' => ['sample' => true]]);
     */
    'enabled_overrides' => [],
];
