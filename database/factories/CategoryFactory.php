<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Portal;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Category> */
class CategoryFactory extends Factory
{
    protected $model = Category::class;

    public function definition(): array
    {
        return [
            'portal_id' => Portal::factory(),
            'name' => 'MyString',
            'description' => 'MyText',
            'position' => 1,
            'slug' => Str::random(12),
        ];
    }
}
