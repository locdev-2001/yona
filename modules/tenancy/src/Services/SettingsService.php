<?php

namespace Modules\Tenancy\Services;

use Modules\Tenancy\Models\WorkspaceSetting;

/**
 * Single gateway for workspace key-value settings. All reads and writes MUST
 * go through this service — never access WorkspaceSetting columns directly.
 *
 * Serialize contract: value column is JSONB cast 'array'. set() accepts any
 * PHP value; Eloquent encodes to JSON. get() returns decoded PHP value.
 * null value means key exists but unset. forget() removes the row entirely.
 * NEVER uses PHP serialize() — intentional departure from Perfex tbloptions.
 *
 * Precondition: currentWorkspace() must be set (BelongsToWorkspace auto-stamps
 * workspace_id on creating + global scope filters reads).
 */
class SettingsService
{
    /**
     * Retrieve a setting value decoded from JSON, or $default if key absent.
     */
    public function get(string $key, mixed $default = null): mixed
    {
        $setting = WorkspaceSetting::where('key', $key)->first();

        if ($setting === null) {
            return $default;
        }

        return $setting->value;
    }

    /**
     * Upsert a setting. $value is any PHP scalar/array/object — Eloquent's
     * 'array' cast serialises it to JSONB automatically. workspace_id is
     * auto-stamped by BelongsToWorkspace on create.
     */
    public function set(string $key, mixed $value): void
    {
        WorkspaceSetting::updateOrCreate(
            ['key' => $key],
            ['value' => $value],
        );
    }

    /**
     * Remove a setting row entirely (distinguishes absent key from null value).
     */
    public function forget(string $key): void
    {
        WorkspaceSetting::where('key', $key)->delete();
    }
}
