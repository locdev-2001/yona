<?php

namespace App\Services\MergeFields;

use App\Services\MergeFields\Contracts\EntityMergeFields;
use Illuminate\Database\Eloquent\Model;

/**
 * P05 — Merge field resolver stub for Contact entities.
 * Full implementation in P06 when the Contact model ships.
 *
 * TODO P06: expand with actual Contact model fields.
 */
class ContactMergeFields implements EntityMergeFields
{
    public function entityType(): string
    {
        return 'contact';
    }

    /**
     * @return array<string, string>
     */
    public function tokens(): array
    {
        return [
            'contact_name' => 'Contact name',
            'contact_email' => 'Contact email',
            'contact_phone' => 'Contact phone',
            'contact_title' => 'Contact title',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function resolve(Model $entity): array
    {
        $firstName = (string) ($entity->getAttribute('first_name') ?? '');
        $lastName = (string) ($entity->getAttribute('last_name') ?? '');

        return [
            'contact_name' => trim("{$firstName} {$lastName}"),
            'contact_email' => (string) ($entity->getAttribute('email') ?? ''),
            'contact_phone' => (string) ($entity->getAttribute('phone') ?? ''),
            'contact_title' => (string) ($entity->getAttribute('title') ?? ''),
        ];
    }
}
