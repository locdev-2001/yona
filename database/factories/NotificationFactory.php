<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Conversation;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Notification> */
class NotificationFactory extends Factory
{
    protected $model = Notification::class;

    public function definition(): array
    {
        return [
            'account_id' => Account::factory(),
            'user_id' => User::factory(),
            'notification_type' => Notification::typeValue('conversation_creation'),
            'primary_actor_type' => (new Conversation)->getMorphClass(),
            'primary_actor_id' => Conversation::factory(),
            'meta' => [],
        ];
    }

    public function ofType(string $notificationType): self
    {
        return $this->state(fn () => ['notification_type' => Notification::typeValue($notificationType)]);
    }
}
