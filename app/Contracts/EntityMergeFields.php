<?php

namespace App\Contracts;

use Illuminate\Database\Eloquent\Model;

/**
 * P06 — Contract for entity-specific merge-field resolvers (registry pattern).
 *
 * Implementations live in feature modules (crm-sales, projects…) and self-register
 * into MergeFieldResolver via their ServiceProvider.
 * The email module owns the interface; feature modules implement it — no circular dep.
 */
interface EntityMergeFields
{
    /**
     * The entity type this resolver handles (matches morph alias — G3).
     * e.g. 'lead', 'client', 'contact', 'project', 'task'
     */
    public function entityType(): string;

    /**
     * Map of token key → human-readable label for the UI palette.
     *
     * @return array<string, string> e.g. ['lead_name' => 'Lead name', 'lead_email' => 'Lead email']
     */
    public function tokens(): array;

    /**
     * Resolve token keys to real values from the given entity instance.
     *
     * @return array<string, string> e.g. ['lead_name' => 'Nguyễn Văn A', 'lead_email' => '...']
     */
    public function resolve(Model $entity): array;
}
