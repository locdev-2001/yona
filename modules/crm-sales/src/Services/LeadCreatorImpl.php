<?php

namespace Modules\CrmSales\Services;

use Modules\CrmSales\Contracts\LeadCreator;
use Modules\CrmSales\Models\Contact;
use Modules\CrmSales\Models\Lead;

/**
 * LeadCreator implementation bound in CrmSalesServiceProvider.
 * Phase 07 inbox uses app(LeadCreator::class)->createFromContact().
 */
class LeadCreatorImpl implements LeadCreator
{
    public function __construct(private readonly LeadService $leadService) {}

    /**
     * @param  array<string, mixed>  $attrs
     */
    public function createFromContact(Contact $contact, array $attrs): Lead
    {
        // Populate lead from contact fields + extra attrs (pipeline_id, stage_id required)
        $leadAttrs = array_merge([
            'name' => $contact->fullName(),
            'email' => $contact->email,
            'phone' => $contact->phone,
        ], $attrs);

        return $this->leadService->create($leadAttrs);
    }
}
