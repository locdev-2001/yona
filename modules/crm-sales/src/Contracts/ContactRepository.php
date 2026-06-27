<?php

namespace Modules\CrmSales\Contracts;

use Modules\CrmSales\Models\Contact;

/**
 * ContactRepository contract — phơi cho cdp IdentityResolver (Phase 07).
 * cdp gọi qua contract này để dedup golden profile mà không import Model trực tiếp.
 */
interface ContactRepository
{
    /**
     * Find a contact by phone number within the current workspace.
     */
    public function findByPhone(string $phone): ?Contact;

    /**
     * Find a contact by email address within the current workspace.
     */
    public function findByEmail(string $email): ?Contact;

    /**
     * Create a draft contact (client_id nullable — "Liên hệ nháp").
     * Phase 07 will use this; client_id constraint stays NOT NULL until then.
     *
     * @param  array<string, mixed>  $attrs
     */
    public function createDraft(array $attrs): Contact;
}
