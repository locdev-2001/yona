<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\Public\CsatSurveyResource;
use App\Models\Conversation;
use App\Models\Message;
use App\Support\SubmittedValues;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

// Port từ refs/chatwoot/app/controllers/public/api/v1/csat_survey_controller.rb.
// Khách chấm điểm ngoài widget (đường dẫn khảo sát gửi kèm tin) — không phiên,
// không token: bằng chứng danh tính là `uuid` của hội thoại trên URL.
class CsatSurveyController extends Controller
{
    // check_csat_locked: quá 14 ngày kể từ NGÀY tạo tin thì khoá.
    private const EDITABLE_FOR_DAYS = 14;

    public function show(string $uuid): JsonResponse
    {
        return response()->json(CsatSurveyResource::toArray($this->surveyMessage($uuid)));
    }

    public function update(Request $request, string $uuid): JsonResponse
    {
        $message = $this->surveyMessage($uuid);

        if ($message->created_at->startOfDay()->diffInDays(now()->startOfDay()) > self::EDITABLE_FOR_DAYS) {
            return response()->json(['error' => 'You cannot update the CSAT survey after 14 days'], 422);
        }

        $message->update([
            'content_attributes' => [
                ...($message->content_attributes ?? []),
                'submitted_values' => SubmittedValues::permit($request->input('message.submitted_values')),
            ],
        ]);

        return response()->json(CsatSurveyResource::toArray($message->refresh()));
    }

    private function surveyMessage(string $uuid): Message
    {
        // Cột `uuid` là kiểu uuid của Postgres — chuỗi rác trên URL phải trả 404
        // chứ không được để truy vấn nổ ở tầng driver.
        abort_unless(Str::isUuid($uuid), 404);

        $conversation = Conversation::query()->where('uuid', $uuid)->firstOrFail();

        return $conversation->messages()
            ->where('content_type', Message::CONTENT_TYPES['input_csat'])
            ->firstOrFail();
    }
}
