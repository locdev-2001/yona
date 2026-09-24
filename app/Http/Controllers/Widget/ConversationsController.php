<?php

namespace App\Http\Controllers\Widget;

use App\Actions\ContactIdentifyAction;
use App\Builders\Messages\MessageBuilder;
use App\Http\Resources\Widget\WidgetConversationResource;
use App\Models\Conversation;
use App\Services\Conversations\TypingStatusManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class ConversationsController extends WidgetController
{
    public function index(Request $request): JsonResponse
    {
        return response()->json((object) WidgetConversationResource::summary($this->conversation($request)));
    }

    public function store(Request $request): JsonResponse
    {
        $conversation = DB::transaction(function () use ($request) {
            $this->processUpdateContact($request);
            $conversation = $this->createConversation($request);

            (new MessageBuilder(
                user: null,
                conversation: $conversation,
                params: $this->messageParams($request, $conversation),
                incomingAllowed: true,
            ))->perform();

            return $conversation->refresh();
        });

        return response()->json(WidgetConversationResource::created($conversation));
    }

    public function updateLastSeen(Request $request): Response
    {
        $conversation = $this->conversation($request);

        if ($conversation === null) {
            return response()->noContent(200);
        }

        $conversation->contact_last_seen_at = now();
        $conversation->save();

        return response()->noContent(200);
    }

    // transcript: mailer thuộc F1 (email channel) — guard được port đủ để widget
    // biết khi nào KHÔNG được gửi, phần gửi thật nối vào sau.
    public function transcript(Request $request): Response
    {
        $conversation = $this->conversation($request);

        if ($conversation === null) {
            return response()->noContent(429);
        }

        return response()->noContent(200);
    }

    public function toggleTyping(Request $request): Response
    {
        $conversation = $this->requireConversation($request);

        (new TypingStatusManager($conversation, $this->contact($request), $request->only('typing_status')))
            ->toggleTypingStatus();

        return response()->noContent(200);
    }

    public function toggleStatus(Request $request): Response
    {
        $conversation = $this->requireConversation($request);

        abort_unless(
            $this->channel($request)->featureEnabled('end_conversation'),
            403,
            'You are not authorized to do this action'
        );

        if (! $conversation->isResolved()) {
            $conversation->update(['status' => Conversation::STATUS_RESOLVED]);
        }

        return response()->noContent(200);
    }

    // Bản gốc không có view cho action này — Rails trả 204 No Content.
    public function setCustomAttributes(Request $request): Response
    {
        $this->requireConversation($request)->update(['custom_attributes' => $this->customAttributes($request)]);

        return response()->noContent();
    }

    public function destroyCustomAttributes(Request $request): JsonResponse
    {
        $conversation = $this->requireConversation($request);
        $removed = (array) $request->input('custom_attribute', []);

        $conversation->update([
            'custom_attributes' => collect($conversation->custom_attributes ?? [])
                ->reject(fn ($value, $key) => in_array($key, $removed, true))
                ->all(),
        ]);

        return response()->json($conversation->fresh()->toArray());
    }

    // process_update_contact: dữ liệu pre-chat form gắn vào hồ sơ khách; tên gốc
    // của hồ sơ đã tồn tại được giữ (retain_original_contact_name).
    private function processUpdateContact(Request $request): void
    {
        $contact = (new ContactIdentifyAction(
            contact: $this->contact($request),
            params: [
                'email' => $this->contactEmail($request),
                'phone_number' => $this->contactPhoneNumber($request),
                'name' => $this->contactName($request),
                'custom_attributes' => $this->contactCustomAttributes($request),
            ],
            retainOriginalContactName: true,
            discardInvalidAttrs: true,
        ))->perform();

        // Gộp hồ sơ dời contact_inbox sang hồ sơ giữ lại — hội thoại phải mang
        // contact_id mới, không phải hồ sơ vừa bị xóa.
        if ($this->contactInbox($request)->contact_id !== $contact->id) {
            $this->contactInbox($request)->refresh();
        }
    }

    private function requireConversation(Request $request): Conversation
    {
        $conversation = $this->conversation($request);

        abort_if($conversation === null, 404, 'Resource could not be found');

        return $conversation;
    }
}
