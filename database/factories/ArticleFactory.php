<?php

namespace Database\Factories;

use App\Models\Article;
use App\Models\Portal;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Article> */
class ArticleFactory extends Factory
{
    protected $model = Article::class;

    public function definition(): array
    {
        return [
            'portal_id' => Portal::factory(),
            'author_id' => User::factory(),
            'locale' => 'en',
            'title' => $this->faker->sentence(3).' '.Str::random(8),
            'content' => 'MyText',
            'description' => 'MyDescrption',
            'status' => 'published',
            'views' => 0,
        ];
    }
}
