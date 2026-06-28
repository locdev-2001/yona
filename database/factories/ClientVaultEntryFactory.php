<?php

namespace Database\Factories;

use Modules\CrmSales\Models\Client;
use Modules\CrmSales\Models\ClientVaultEntry;
use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Workspace;

/**
 * @extends Factory<ClientVaultEntry>
 */
class ClientVaultEntryFactory extends Factory
{
    protected $model = ClientVaultEntry::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'client_id' => Client::factory(),
            'name' => fake()->words(2, true),
            'server_address' => fake()->optional(0.7)->domainName(),
            'port' => fake()->optional(0.5)->numberBetween(1, 65535),
            'username' => fake()->optional(0.7)->userName(),
            'password' => fake()->optional(0.6)->password(),
            'description' => fake()->optional(0.4)->sentence(),
            'share_in_projects' => false,
            'visibility' => 'private',
        ];
    }
}
