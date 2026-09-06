<?php

namespace App\Http\Resources\Public;

use App\Models\CsatSurveyResponse;
use App\Models\Message;

// Port từ app/views/public/api/v1/models/_csat_survey.json.jbuilder — payload
// của trang khảo sát công khai (khách chấm điểm ngoài widget).
final class CsatSurveyResource
{
    /** @return array<string, mixed> */
    public static function toArray(Message $message): array
    {
        $inbox = $message->inbox;

        return [
            'id' => $message->id,
            'csat_survey_response' => self::response($message->csatSurveyResponse),
            'display_type' => $inbox->csat_config['display_type'] ?? 'emoji',
            'content' => $inbox->csat_config['message'] ?? null,
            'inbox_avatar_url' => $inbox->avatarUrl(),
            'inbox_name' => $inbox->name,
            'locale' => $message->account->locale,
            'conversation_id' => $message->conversation_id,
            'created_at' => $message->created_at->toISOString(),
        ];
    }

    /** @return array<string, mixed>|null */
    private static function response(?CsatSurveyResponse $response): ?array
    {
        return $response?->attributesToArray();
    }
}
