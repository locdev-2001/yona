<?php

namespace Database\Factories;

use App\Models\Client;
use Modules\Tenancy\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Client>
 */
class ClientFactory extends Factory
{
    protected $model = Client::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // Respect active workspace context (RLS WITH CHECK on insert)
            'workspace_id' => currentWorkspace()?->id ?? Workspace::factory(),
            'owner_id' => null,
            'name' => fake()->company(),
            'vat' => fake()->optional(0.4)->numerify('VN##########'),
            'phone' => fake()->optional(0.7)->phoneNumber(),
            'website' => fake()->optional(0.5)->url(),
            'currency' => 'VND',
            'default_language' => 'vi',
            'billing_street' => fake()->optional(0.6)->streetAddress(),
            'billing_city' => fake()->optional(0.6)->city(),
            'billing_state' => fake()->optional(0.4)->state(),
            'billing_zip' => fake()->optional(0.4)->postcode(),
            'billing_country' => fake()->optional(0.5)->country(),
        ];
    }
}
