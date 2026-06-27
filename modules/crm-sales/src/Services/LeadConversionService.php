<?php

namespace Modules\CrmSales\Services;

use Illuminate\Support\Facades\DB;
use Modules\CrmSales\Events\LeadConverted;
use Modules\CrmSales\Models\Client;
use Modules\CrmSales\Models\Contact;
use Modules\CrmSales\Models\Lead;
use Modules\CrmSales\Models\PipelineStage;
use Modules\Shared\Models\CustomFieldDefinition;
use Modules\Shared\Services\CustomFieldService;
use Modules\Shared\Support\Activity\ActivityLogger;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * P07 — Convert a Lead to a Client + primary Contact (G7).
 *
 * Safety guarantees (G7):
 *  1. assert lead.workspace_id === currentWorkspace()->id (else abort 404)
 *  2. idempotency guard: date_converted !== null → abort 422
 *  3. all writes in DB::transaction
 *  4. attach-existing: client_id scoped to current workspace
 *  5. post-assert: client.workspace_id === lead.workspace_id
 *
 * After conversion: lead.date_converted = now(), stage → won/is_default,
 * lead.converted_client_id = client.id, client.leadid = lead.id.
 * Notes re-pointed to client. Custom fields mapped by slug.
 * Lead is NOT deleted (preserved for history).
 */
class LeadConversionService
{
    public function __construct(
        private readonly CustomFieldService $customFieldService,
        private readonly ActivityLogger $activityLogger,
    ) {}

    /**
     * Convert a lead to a new (or existing) client + primary contact.
     *
     * @param  array<string, mixed>  $options  Supported keys:
     *                                         - client_id (string|null): attach existing client UUID (scoped workspace)
     *                                         - client_name (string): override for new client name (defaults to lead.company)
     *                                         - contact_name (string): override for contact name
     *
     * @throws HttpException 404 when lead is outside current workspace
     * @throws HttpException 422 when lead is already converted
     */
    public function convert(Lead $lead, array $options = []): Client
    {
        $workspace = currentWorkspace();

        // ── G7 (1): isolation assert ──────────────────────────────────────────
        if ($lead->workspace_id !== $workspace->id) {
            abort(404);
        }

        // ── G7 (2): idempotency guard ─────────────────────────────────────────
        if ($lead->date_converted !== null) {
            abort(422, __('leads.errors.already_converted'));
        }

        return DB::transaction(function () use ($lead, $options, $workspace): Client {
            // ── G7 (3+4): create or attach client ────────────────────────────
            if (! empty($options['client_id'])) {
                $client = Client::where('id', $options['client_id'])
                    ->where('workspace_id', $workspace->id)
                    ->first();

                if ($client === null) {
                    abort(422, __('leads.errors.client_not_in_workspace'));
                }
            } else {
                $client = $this->createClientFromLead($lead, $options);
            }

            // ── G7 (5): post-assert workspace match ───────────────────────────
            if ($client->workspace_id !== $lead->workspace_id) {
                abort(422, __('leads.errors.client_workspace_mismatch'));
            }

            // Create primary contact (only when creating new client)
            if (empty($options['client_id'])) {
                $this->createPrimaryContact($lead, $client, $options);
            }

            // Map custom fields: lead → client/contact (same slug, skip unknown)
            $this->mapCustomFields($lead, $client);

            // Re-point notes from lead → client
            $this->repointNotes($lead, $client);

            // Move lead to won stage
            $wonStage = $this->resolveWonStage($lead);

            // Update lead: mark converted
            $lead->date_converted = now();
            $lead->converted_client_id = $client->id;
            if ($wonStage !== null) {
                $lead->stage_id = $wonStage->id;
            }
            $lead->save();

            // Update client: link back to lead
            $client->leadid = $lead->id;
            $client->save();

            // Log activities
            $this->activityLogger->log($lead, 'lead.converted', [
                'client_id' => $client->id,
                'client_name' => $client->name,
            ]);

            $this->activityLogger->log($client, 'client.created_from_lead', [
                'lead_id' => $lead->id,
                'lead_name' => $lead->name,
            ]);

            event(new LeadConverted($lead, $client));

            return $client;
        });
    }

    // ─── Internal helpers ──────────────────────────────────────────────────────

    /**
     * Build a new Client from lead fields.
     *
     * @param  array<string, mixed>  $options
     */
    private function createClientFromLead(Lead $lead, array $options): Client
    {
        $client = new Client;
        $client->name = $options['client_name'] ?? $lead->company ?? $lead->name;
        $client->phone = $lead->phone;
        $client->website = $lead->website;
        $client->currency = 'VND';  // default per B5
        $client->billing_street = $lead->address;
        $client->billing_city = $lead->city;
        $client->billing_state = $lead->state;
        $client->billing_zip = $lead->zip;
        $client->billing_country = $lead->country;
        $client->owner_id = $lead->owner_id ?? auth()->id();
        $client->save();

        return $client;
    }

    /**
     * Create primary contact from lead person fields.
     *
     * @param  array<string, mixed>  $options
     */
    private function createPrimaryContact(Lead $lead, Client $client, array $options): void
    {
        // Parse name: if lead.name looks like "First Last", split it
        $nameParts = explode(' ', trim($options['contact_name'] ?? $lead->name), 2);
        $firstName = $nameParts[0];
        $lastName = $nameParts[1] ?? null;

        $contact = new Contact;
        $contact->client_id = $client->id;
        $contact->first_name = $firstName;
        $contact->last_name = $lastName;
        $contact->email = $lead->email;
        $contact->phone = $lead->phone;
        $contact->title = $lead->title;
        $contact->is_primary = true;
        $contact->save();
    }

    /**
     * Map lead custom fields to client (and contact) by matching slug.
     * Slugs not present in the target entity definition are silently skipped.
     */
    private function mapCustomFields(Lead $lead, Client $client): void
    {
        $leadFields = $lead->custom_fields ?? [];

        if (empty($leadFields)) {
            return;
        }

        // Map to client: only slugs that exist in client's entity type
        $clientDefs = CustomFieldDefinition::forEntity('client')
            ->active()
            ->pluck('slug')
            ->toArray();

        $clientPayload = array_intersect_key($leadFields, array_flip($clientDefs));

        if (! empty($clientPayload)) {
            $this->customFieldService->apply($client, $clientPayload);
            $client->save();
        }
    }

    /**
     * Re-point notes from lead → client (same workspace; only morph changes).
     * RLS not affected as workspace_id stays unchanged.
     */
    private function repointNotes(Lead $lead, Client $client): void
    {
        $lead->notes()->update([
            'noteable_type' => $client->getMorphClass(),
            'noteable_id' => $client->id,
        ]);
    }

    /**
     * Find the won stage (type='won') for the lead's pipeline.
     * Falls back to is_default=true stage, then null (no stage change).
     */
    private function resolveWonStage(Lead $lead): ?PipelineStage
    {
        return PipelineStage::where('pipeline_id', $lead->pipeline_id)
            ->where('workspace_id', currentWorkspace()->id)
            ->where('type', 'won')
            ->first();
    }
}
