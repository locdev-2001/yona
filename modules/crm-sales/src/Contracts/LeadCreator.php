<?php

namespace Modules\CrmSales\Contracts;

use Modules\CrmSales\Models\Contact;
use Modules\CrmSales\Models\Lead;

/**
 * LeadCreator contract — phơi cho inbox (Phase 07).
 * inbox gọi createFromContact() để biến Conversation → Lead
 * mà không cần import Modules\CrmSales\Models\Lead trực tiếp.
 */
interface LeadCreator
{
    /**
     * Create a Lead from an existing Contact (inbox → Lead flow, Phase 07).
     *
     * @param  array<string, mixed>  $attrs  Extra lead attributes (pipeline_id, stage_id, name, etc.)
     */
    public function createFromContact(Contact $contact, array $attrs): Lead;
}
