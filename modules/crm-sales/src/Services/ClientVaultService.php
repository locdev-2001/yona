<?php

namespace Modules\CrmSales\Services;

use Illuminate\Support\Facades\DB;
use Modules\CrmSales\Models\Client;
use Modules\CrmSales\Models\ClientVaultEntry;

/**
 * P06 (should) — Vault entry management for clients.
 * password is encrypted via the model's 'encrypted' cast (Crypt at rest).
 */
class ClientVaultService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function store(Client $client, array $data): ClientVaultEntry
    {
        return DB::transaction(function () use ($client, $data): ClientVaultEntry {
            $entry = new ClientVaultEntry;
            $entry->fill($data);
            $entry->client_id = $client->id;
            $entry->save();

            return $entry;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(ClientVaultEntry $entry, array $data): ClientVaultEntry
    {
        return DB::transaction(function () use ($entry, $data): ClientVaultEntry {
            $entry->fill($data);
            $entry->save();

            return $entry;
        });
    }

    public function delete(ClientVaultEntry $entry): void
    {
        DB::transaction(function () use ($entry): void {
            $entry->delete();
        });
    }
}
