<?php

namespace App\Services;

use App\Models\Client;
use App\Models\Contact;
use App\Models\WorkspaceMember;
use App\Support\Activity\ActivityLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * P06 — Single entry-point for all Client + Contact write operations.
 * All writes in DB::transaction. Business logic lives here — controllers are thin.
 *
 * Primary contact invariant: max 1 is_primary=true per client; swap in transaction.
 * Customer-admin validation: user must be active WorkspaceMember of the workspace (G12).
 */
class ClientService
{
    public function __construct(
        private readonly CustomFieldService $customFieldService,
        private readonly ActivityLogger $activityLogger,
    ) {}

    /**
     * Create a client + optional primary contact + apply custom fields + sync groups.
     *
     * @param  array<string, mixed>  $clientData
     * @param  array<string, mixed>|null  $primaryContactData
     * @param  array{client?: array<string, mixed>, contact?: array<string, mixed>}  $customFields
     * @param  list<string>  $groupIds
     */
    public function create(
        array $clientData,
        ?array $primaryContactData = null,
        array $customFields = [],
        array $groupIds = [],
    ): Client {
        return DB::transaction(function () use ($clientData, $primaryContactData, $customFields, $groupIds): Client {
            $client = new Client;
            $client->fill($clientData);
            $client->owner_id = auth()->id();
            $client->save();

            // Apply client custom fields
            if (! empty($customFields['client'] ?? [])) {
                $this->customFieldService->apply($client, $customFields['client']);
                $client->save();
            }

            // Create primary contact if provided
            if ($primaryContactData && ! empty($primaryContactData['first_name'])) {
                $contact = new Contact;
                $contact->fill($primaryContactData);
                $contact->client_id = $client->id;
                $contact->is_primary = true;
                $contact->save();

                if (! empty($customFields['contact'] ?? [])) {
                    $this->customFieldService->apply($contact, $customFields['contact']);
                    $contact->save();
                }
            }

            // Sync group memberships
            if (! empty($groupIds)) {
                $this->syncGroups($client, $groupIds);
            }

            $this->activityLogger->log($client, 'client.created', [
                'name' => $client->name,
            ]);

            return $client;
        });
    }

    /**
     * Update client fields + custom fields.
     *
     * @param  array<string, mixed>  $clientData
     * @param  array<string, mixed>  $customFields
     */
    public function update(Client $client, array $clientData, array $customFields = []): Client
    {
        return DB::transaction(function () use ($client, $clientData, $customFields): Client {
            $client->fill($clientData);

            if (! empty($customFields)) {
                $this->customFieldService->apply($client, $customFields);
            }

            $client->save();

            $this->activityLogger->log($client, 'client.updated', [
                'name' => $client->name,
            ]);

            return $client;
        });
    }

    /**
     * Soft-delete a client (contacts cascade via DB FK). No GDPR purge (skip).
     */
    public function delete(Client $client): void
    {
        DB::transaction(function () use ($client): void {
            $client->delete();
        });
    }

    /**
     * Add a contact to a client. If makePrimary, swap primary first.
     *
     * @param  array<string, mixed>  $contactData
     * @param  array<string, mixed>  $customFields
     */
    public function addContact(
        Client $client,
        array $contactData,
        bool $makePrimary = false,
        array $customFields = [],
    ): Contact {
        return DB::transaction(function () use ($client, $contactData, $makePrimary, $customFields): Contact {
            $contact = new Contact;
            $contact->fill($contactData);
            $contact->client_id = $client->id;
            $contact->is_primary = false;
            $contact->save();

            if (! empty($customFields)) {
                $this->customFieldService->apply($contact, $customFields);
                $contact->save();
            }

            if ($makePrimary) {
                $this->setPrimary($contact);
            }

            $this->activityLogger->log($client, 'client.contact_added', [
                'contact_id' => $contact->id,
                'name' => $contact->fullName(),
            ]);

            return $contact;
        });
    }

    /**
     * Update a contact's fields.
     *
     * @param  array<string, mixed>  $contactData
     * @param  array<string, mixed>  $customFields
     */
    public function updateContact(
        Contact $contact,
        array $contactData,
        bool $makePrimary = false,
        array $customFields = [],
    ): Contact {
        return DB::transaction(function () use ($contact, $contactData, $makePrimary, $customFields): Contact {
            $contact->fill($contactData);

            if (! empty($customFields)) {
                $this->customFieldService->apply($contact, $customFields);
            }

            $contact->save();

            if ($makePrimary && ! $contact->is_primary) {
                $this->setPrimary($contact);
            }

            return $contact;
        });
    }

    /**
     * Set this contact as primary — reset all others in the same client first.
     * Primary contact invariant: max 1 is_primary per client (spec §Architecture).
     */
    public function setPrimary(Contact $contact): void
    {
        DB::transaction(function () use ($contact): void {
            // Reset all contacts of the same client
            Contact::where('client_id', $contact->client_id)
                ->where('id', '!=', $contact->id)
                ->update(['is_primary' => false]);

            $contact->is_primary = true;
            $contact->save();

            $client = $contact->client;
            $this->activityLogger->log($client, 'contact.primary_changed', [
                'contact_id' => $contact->id,
                'name' => $contact->fullName(),
            ]);
        });
    }

    /**
     * Soft-delete a contact.
     */
    public function deleteContact(Contact $contact): void
    {
        DB::transaction(function () use ($contact): void {
            $contact->delete();
        });
    }

    /**
     * Sync client groups idempotently (replace all).
     * groupIds must be validated (Rule::exists scoped to workspace) before calling.
     * Uses manual attach/detach to avoid ambiguous `id` column in BelongsToMany sync().
     *
     * @param  list<string>  $groupIds
     */
    public function syncGroups(Client $client, array $groupIds): void
    {
        // Current group ids
        $current = DB::table('client_group_client')
            ->where('client_id', $client->id)
            ->pluck('client_group_id')
            ->toArray();

        $toAttach = array_diff($groupIds, $current);
        $toDetach = array_diff($current, $groupIds);

        // Detach removed groups
        if (! empty($toDetach)) {
            DB::table('client_group_client')
                ->where('client_id', $client->id)
                ->whereIn('client_group_id', $toDetach)
                ->delete();
        }

        // Attach new groups with workspace_id (G4 RLS)
        foreach ($toAttach as $groupId) {
            DB::table('client_group_client')->insert([
                'id' => (string) Str::uuid(),
                'workspace_id' => $client->workspace_id,
                'client_id' => $client->id,
                'client_group_id' => $groupId,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Sync customer-admin users idempotently.
     * G12 — each userId MUST be an active WorkspaceMember of the workspace.
     *
     * @param  list<int>  $userIds
     */
    public function syncCustomerAdmins(Client $client, array $userIds): void
    {
        // Validate every userId is an active member of the workspace (G12)
        $validCount = WorkspaceMember::where('workspace_id', $client->workspace_id)
            ->whereIn('user_id', $userIds)
            ->where('status', 'active')
            ->count();

        if ($validCount !== count($userIds)) {
            throw new InvalidArgumentException(
                __('clients.errors.customer_admin_not_member')
            );
        }

        // Build pivot data with workspace_id for RLS compliance (G4)
        $pivotData = [];
        foreach ($userIds as $userId) {
            $pivotData[$userId] = ['workspace_id' => $client->workspace_id];
        }

        $client->customerAdmins()->sync($pivotData);
    }
}
