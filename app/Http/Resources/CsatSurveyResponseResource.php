<?php

namespace App\Http\Resources;

use App\Models\Account;
use App\Models\CsatSurveyResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

// Port từ api/v1/models/_csat_survey_response.json.jbuilder.
// Bỏ csat_review_notes / review_notes_updated_* (enterprise).
class CsatSurveyResponseResource extends JsonResource
{
    public function __construct(CsatSurveyResponse $resource, private readonly Account $account)
    {
        parent::__construct($resource);
    }

    /** @param iterable<CsatSurveyResponse> $responses */
    public static function forAccount(iterable $responses, Account $account): array
    {
        return collect($responses)
            ->map(fn (CsatSurveyResponse $response) => (new self($response, $account))->toArray(request()))
            ->values()
            ->all();
    }

    public function toArray(Request $request): array
    {
        /** @var CsatSurveyResponse $response */
        $response = $this->resource;

        $payload = [
            'id' => $response->id,
            'rating' => $response->rating,
            'feedback_message' => $response->feedback_message,
            'account_id' => $response->account_id,
            'message_id' => $response->message_id,
            'conversation_id' => $response->conversation?->display_id,
            'created_at' => $response->created_at->getTimestamp(),
        ];

        if ($response->contact !== null) {
            $payload['contact'] = (new ContactResource($response->contact))->toArray($request);
        }

        if ($response->assignedAgent !== null) {
            $payload['assigned_agent'] = (new AgentResource($response->assignedAgent, $this->account))->toArray($request);
        }

        return $payload;
    }
}
