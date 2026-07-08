<?php

namespace App\Services\MergeFields;

use App\Contracts\EntityMergeFields;
use Illuminate\Database\Eloquent\Model;

/**
 * P06 — Merge field resolver for Lead entities.
 *
 * Registered in CrmSalesServiceProvider into App\Services\MergeFieldResolver.
 * Implements EntityMergeFields from the email module (reverse-registry pattern).
 *
 * TODO P07: once Lead model is built, verify all field names match and
 * add any additional fields (company, phone, source, assigned team, etc.).
 */
class LeadMergeFields implements EntityMergeFields
{
    public function entityType(): string
    {
        return 'lead';
    }

    /**
     * @return array<string, string>
     */
    public function tokens(): array
    {
        return [
            'lead_name' => 'Lead name',
            'lead_email' => 'Lead email',
            'lead_phone' => 'Lead phone',
            'lead_company' => 'Lead company',
            'lead_value' => 'Lead value',
            'lead_source' => 'Lead source',
            'assignee_name' => 'Assignee name',
            'assignee_email' => 'Assignee email',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function resolve(Model $entity): array
    {
        // TODO P07: fill in actual Lead model field names when Lead is built.
        // Generic attribute access to work with any model that has these fields.
        // Use getAttribute() / getRelation() throughout to avoid undefined-property
        // PHPStan errors on the generic Model base class (Lead model ships in P07).

        $assignee = method_exists($entity, 'assignee')
            ? $entity->getRelation('assignee')
            : $entity->getAttribute('assignee');

        $source = $entity->getAttribute('source');

        $assigneeName = ($assignee instanceof Model)
            ? (string) ($assignee->getAttribute('name') ?? '')
            : '';
        $assigneeEmail = ($assignee instanceof Model)
            ? (string) ($assignee->getAttribute('email') ?? '')
            : '';

        $sourceName = ($source instanceof Model)
            ? (string) ($source->getAttribute('name') ?? '')
            : '';

        return [
            'lead_name' => (string) ($entity->getAttribute('name') ?? ''),
            'lead_email' => (string) ($entity->getAttribute('email') ?? ''),
            'lead_phone' => (string) ($entity->getAttribute('phone') ?? ''),
            'lead_company' => (string) ($entity->getAttribute('company') ?? ''),
            'lead_value' => (string) ($entity->getAttribute('lead_value') ?? ''),
            'lead_source' => $sourceName,
            'assignee_name' => $assigneeName,
            'assignee_email' => $assigneeEmail,
        ];
    }
}
