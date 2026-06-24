<?php

namespace App\Services\MergeFields;

use App\Services\MergeFields\Contracts\EntityMergeFields;
use Illuminate\Database\Eloquent\Model;

/**
 * P05 — Merge field resolver stub for Client entities.
 * Full implementation in P06 when the Client model ships.
 *
 * TODO P06: expand with actual Client model fields.
 */
class ClientMergeFields implements EntityMergeFields
{
    public function entityType(): string
    {
        return 'client';
    }

    /**
     * @return array<string, string>
     */
    public function tokens(): array
    {
        return [
            'client_name' => 'Client name',
            'client_email' => 'Client email',
            'client_phone' => 'Client phone',
            'client_website' => 'Client website',
            'client_country' => 'Client country',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function resolve(Model $entity): array
    {
        return [
            'client_name' => (string) ($entity->getAttribute('name') ?? ''),
            'client_email' => (string) ($entity->getAttribute('email') ?? ''),
            'client_phone' => (string) ($entity->getAttribute('phone') ?? ''),
            'client_website' => (string) ($entity->getAttribute('website') ?? ''),
            'client_country' => (string) ($entity->getAttribute('country') ?? ''),
        ];
    }
}
