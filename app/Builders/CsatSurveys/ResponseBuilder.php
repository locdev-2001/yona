<?php

namespace App\Builders\CsatSurveys;

use App\Models\CsatSurveyResponse;
use App\Models\Message;
use RuntimeException;

// Port từ refs/chatwoot/app/builders/csat_surveys/response_builder.rb — biến
// `submitted_values` của tin khảo sát thành một phiếu trả lời (chấm lại thì ghi
// đè chính phiếu đó).
final class ResponseBuilder
{
    public function __construct(private readonly Message $message) {}

    public function perform(): ?CsatSurveyResponse
    {
        if (! $this->message->isInputCsat()) {
            throw new RuntimeException('Invalid Message');
        }

        $rating = data_get($this->message->content_attributes, 'submitted_values.csat_survey_response.rating');

        if (blank($rating)) {
            return null;
        }

        $conversation = $this->message->conversation;

        $response = $this->message->csatSurveyResponse ?? new CsatSurveyResponse([
            'message_id' => $this->message->id,
            'account_id' => $this->message->account_id,
            'conversation_id' => $this->message->conversation_id,
            'contact_id' => $conversation->contact_id,
            'assigned_agent_id' => $conversation->assignee_id,
        ]);

        $response->fill([
            'rating' => $rating,
            'feedback_message' => data_get($this->message->content_attributes, 'submitted_values.csat_survey_response.feedback_message'),
        ]);
        $response->save();

        return $response;
    }
}
