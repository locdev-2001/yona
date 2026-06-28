<?php

namespace App\Services;

use App\Contracts\EntityMergeFields;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use App\Services\CustomFieldService;

/**
 * P06 — Orchestrates all entity merge-field resolvers (registry pattern).
 *
 * Feature modules self-register providers via their ServiceProvider (reverse-registry).
 * Email module only knows the EntityMergeFields contract — never imports domain models.
 *
 * Token format: {snake_key} (curly braces, all lowercase + underscore).
 * Unknown / missing tokens are stripped to empty string — never leaked as raw {token}.
 */
class MergeFieldResolver
{
    /** @var array<string, EntityMergeFields> */
    private array $resolvers = [];

    /**
     * @param  iterable<EntityMergeFields>  $entityResolvers
     */
    public function __construct(iterable $entityResolvers)
    {
        foreach ($entityResolvers as $resolver) {
            $this->resolvers[$resolver->entityType()] = $resolver;
        }
    }

    /**
     * Register a merge-field provider at runtime (called by feature module ServiceProviders).
     */
    public function register(EntityMergeFields $provider): void
    {
        $this->resolvers[$provider->entityType()] = $provider;
    }

    /**
     * Return available tokens for a given entity type (for the UI palette).
     *
     * @return array<string, string> token => label
     */
    public function tokensFor(string $entityType): array
    {
        $resolver = $this->resolvers[$entityType] ?? null;

        return $resolver?->tokens() ?? [];
    }

    /**
     * Resolve all context entities into a flat token → value map.
     * Adds global tokens ({company_name}, {current_date}).
     *
     * @param  array<string, Model>  $context  already G9-filtered by TemplatedMailer
     * @return array<string, string>
     */
    public function resolve(array $context): array
    {
        $values = [];

        foreach ($context as $entityType => $entity) {
            $resolver = $this->resolvers[$entityType] ?? null;

            if ($resolver === null) {
                Log::warning('merge_field_resolver.no_resolver_for_entity_type', [
                    'entity_type' => $entityType,
                ]);

                continue;
            }

            $resolved = $resolver->resolve($entity);
            $values = array_merge($values, $resolved);
        }

        // Global tokens always available.
        $workspace = currentWorkspace();
        $values['company_name'] = $workspace !== null ? ($workspace->name ?? '') : '';
        $values['current_date'] = now()->toDateString();

        // Optional: wire custom-field tokens from CustomFieldService (P02).
        // Guard with class_exists so email doesn't hard-depend on P02 order.
        if (class_exists(CustomFieldService::class)) {
            foreach ($context as $entityType => $entity) {
                $this->resolveCustomFieldTokens($entityType, $entity, $values);
            }
        }

        return $values;
    }

    /**
     * Render a template string by replacing {token} with resolved values.
     * Any token still present after all resolutions is stripped to empty string
     * — no {token} can leak into the final output.
     *
     * @param  array<string, string>  $values
     */
    public function render(string $text, array $values): string
    {
        $pairs = [];
        foreach ($values as $key => $value) {
            $pairs["{{$key}}"] = $value;
        }

        $rendered = strtr($text, $pairs);

        // Strip any remaining {unknown_token} patterns.
        return (string) preg_replace('/\{[a-z0-9_]+\}/', '', $rendered);
    }

    /**
     * Attempt to add custom-field tokens from the entity's custom_fields JSONB bag.
     *
     * @param  array<string, string>  $values  (mutated in place)
     */
    private function resolveCustomFieldTokens(string $entityType, Model $entity, array &$values): void
    {
        try {
            /** @var array<string, mixed>|null $customFields */
            $customFields = $entity->getAttribute('custom_fields');

            if (! is_array($customFields)) {
                return;
            }

            foreach ($customFields as $slug => $value) {
                $tokenKey = "cf_{$slug}";
                $values[$tokenKey] = is_scalar($value) ? (string) $value : '';
            }
        } catch (\Throwable $e) {
            Log::warning('merge_field_resolver.custom_field_token_error', [
                'entity_type' => $entityType,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
