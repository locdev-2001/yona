<?php

namespace Modules\CrmSales\Services;

use Modules\CrmSales\Contracts\ContactRepository;
use Modules\CrmSales\Models\Contact;

/**
 * ContactRepository implementation bound in CrmSalesServiceProvider.
 * Phase 07 inbox uses app(ContactRepository::class) — no direct Model import needed.
 */
class ContactRepositoryImpl implements ContactRepository
{
    public function findByPhone(string $phone): ?Contact
    {
        return Contact::where('phone', $phone)
            ->where('workspace_id', currentWorkspace()->id)
            ->first();
    }

    public function findByEmail(string $email): ?Contact
    {
        return Contact::where('email', $email)
            ->where('workspace_id', currentWorkspace()->id)
            ->first();
    }

    /**
     * @param  array<string, mixed>  $attrs
     */
    public function createDraft(array $attrs): Contact
    {
        $contact = new Contact;
        $contact->fill($attrs);
        $contact->save();

        return $contact;
    }
}
