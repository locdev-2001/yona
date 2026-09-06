<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Conversation;
use App\Models\CsatSurveyResponse;
use App\Models\Message;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CsatSurveyResponse>
 */
class CsatSurveyResponseFactory extends Factory
{
    public function definition(): array
    {
        return [
            'rating' => 1,
            'feedback_message' => $this->faker->sentence(),
            'account_id' => Account::factory(),
        ];
    }

    // Factory :csat_survey_response gốc khai `account`/`conversation`/`message`/
    // `contact` rời nhau; ở đây ba bản ghi sau bám theo tin (hoặc hội thoại) đã
    // truyền vào để mọi khóa ngoại nằm cùng một tenant.
    public function configure(): static
    {
        return $this->afterMaking(function (CsatSurveyResponse $response) {
            $message = $response->message_id === null ? null : Message::findOrFail($response->message_id);

            if ($response->conversation_id === null) {
                $response->conversation_id = $message?->conversation_id
                    ?? Conversation::factory()->create(['account_id' => $response->account_id])->id;
            }

            if ($response->message_id === null) {
                $response->message_id = Message::factory()->create([
                    'account_id' => $response->account_id,
                    'conversation_id' => $response->conversation_id,
                ])->id;
            }

            if ($response->contact_id === null) {
                $response->contact_id = $response->conversation->contact_id;
            }
        });
    }
}
