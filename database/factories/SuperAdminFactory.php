<?php

namespace Database\Factories;

use App\Models\SuperAdmin;

/**
 * @extends UserFactory<SuperAdmin>
 */
class SuperAdminFactory extends UserFactory
{
    protected $model = SuperAdmin::class;

    public function definition(): array
    {
        return [...parent::definition(), 'type' => SuperAdmin::TYPE];
    }
}
