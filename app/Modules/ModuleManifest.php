<?php

namespace App\Modules;

use InvalidArgumentException;

/**
 * Value object wrapping a parsed + validated module.json.
 *
 * Required fields: name, version, enabled, type.
 * Optional fields: depends (default []), provides (default []), entitlement (default null).
 */
final class ModuleManifest
{
    /** @var string[] */
    public readonly array $depends;

    /** @var string[] */
    public readonly array $provides;

    private function __construct(
        public readonly string $name,
        public readonly string $version,
        public readonly bool $enabled,
        public readonly string $type,
        array $depends,
        array $provides,
        public readonly ?string $entitlement,
        public readonly string $path,
    ) {
        $this->depends = $depends;
        $this->provides = $provides;
    }

    /** @param array<string,mixed> $data */
    public static function fromArray(array $data, string $manifestPath): self
    {
        $required = ['name', 'version', 'enabled', 'type'];
        foreach ($required as $field) {
            if (! array_key_exists($field, $data)) {
                throw new InvalidArgumentException(
                    "module.json at [{$manifestPath}] missing required field: [{$field}]"
                );
            }
        }

        $allowedTypes = ['feature', 'driver', 'core'];
        if (! in_array($data['type'], $allowedTypes, strict: true)) {
            throw new InvalidArgumentException(
                "module.json [{$data['name']}] has unknown type [{$data['type']}]. Allowed: "
                .implode(', ', $allowedTypes)
            );
        }

        return new self(
            name: (string) $data['name'],
            version: (string) $data['version'],
            enabled: (bool) $data['enabled'],
            type: (string) $data['type'],
            depends: (array) ($data['depends'] ?? []),
            provides: (array) ($data['provides'] ?? []),
            entitlement: isset($data['entitlement']) ? (string) $data['entitlement'] : null,
            path: dirname($manifestPath),
        );
    }

    public static function fromFile(string $manifestPath): self
    {
        if (! file_exists($manifestPath)) {
            throw new InvalidArgumentException("module.json not found at [{$manifestPath}]");
        }

        $raw = json_decode(file_get_contents($manifestPath), associative: true);

        if (! is_array($raw)) {
            throw new InvalidArgumentException("module.json at [{$manifestPath}] is not valid JSON");
        }

        return self::fromArray($raw, $manifestPath);
    }

    /** Return a copy with the enabled flag overridden (for test/dev use only). */
    public function withEnabled(bool $enabled): self
    {
        return new self(
            name: $this->name,
            version: $this->version,
            enabled: $enabled,
            type: $this->type,
            depends: $this->depends,
            provides: $this->provides,
            entitlement: $this->entitlement,
            path: $this->path,
        );
    }

    /** Studly-cased module name, e.g. 'channel-zalo' → 'ChannelZalo' */
    public function studlyName(): string
    {
        return str_replace(['-', '_', ' '], '', ucwords($this->name, '-_ '));
    }
}
