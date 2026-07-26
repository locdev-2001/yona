<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\Conversation;
use App\Models\Pipeline;
use App\Services\ContactService;
use App\Services\LeadService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * P07-F-1 — Biến 1 Conversation thành Lead (conv→Lead flow).
 *
 * Guard bất biến:
 *   - Idempotency: conversation.lead_id đã set → trả Lead cũ (KHÔNG tạo mới).
 *   - Hội thoại nhóm → 422: một nhóm không phải một người.
 *   - Dedup SĐT: peer_phone → ContactService::resolveOrCreateFromPeer → set contact_id.
 *   - Tạo Lead qua LeadService::createFromContact — KHÔNG tự viết logic Lead.
 *   - Link 2 chiều: conversation.lead_id + leads.conversation_id + leads.contact_id.
 */
class ConversationLeadController extends Controller
{
    public function store(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('update', $conversation);

        // Guard: group thread không tạo Lead
        if ($conversation->isGroup()) {
            return response()->json([
                'message' => 'Không thể tạo Lead từ hội thoại nhóm.',
            ], 422);
        }

        // Idempotency: đã có lead_id → trả existing
        if ($conversation->lead_id !== null) {
            return response()->json([
                'lead_id' => $conversation->lead_id,
                'existing' => true,
            ]);
        }

        // Finding 14: resolveOrCreateFromPeer TRƯỚC transaction — tránh 25P02 (aborted transaction).
        // Khi 23505 nổ TRONG transaction, Postgres abort → catch re-fetch ném 25P02.
        // Contact dedup không cần atomic chung với tạo Lead.
        $contactId = null;
        if ($conversation->peer_phone !== null) {
            $contact = app(ContactService::class)->resolveOrCreateFromPeer(
                workspaceId: $conversation->workspace_id,
                channel: $conversation->channel,
                peerUid: $conversation->peer_uid,
                phone: $conversation->peer_phone,
                displayName: $conversation->peer_name,
            );
            $contactId = $contact?->id;
        }

        try {
            $lead = DB::transaction(function () use ($conversation, $contactId) {
                // Link contact_id vào conversation nếu resolve được (trong transaction để atomic với Lead)
                if ($contactId !== null && $conversation->contact_id !== $contactId) {
                    $conversation->saveQuietly(); // avoid observer side-effects before mutation
                    Conversation::where('id', $conversation->id)
                        ->update(['contact_id' => $contactId]);
                    $conversation->contact_id = $contactId;
                }

                // Resolve pipeline mặc định
                $pipeline = Pipeline::where('workspace_id', currentWorkspace()->id)
                    ->orderByDesc('is_default')
                    ->orderBy('name')
                    ->first();

                $firstStage = $pipeline?->stages()->orderBy('stage_order')->first();

                // Tạo Lead qua LeadService (REUSE — không viết logic Lead)
                $lead = app(LeadService::class)->createFromContact(
                    // createFromContact cần Contact — nhưng contact_id có thể null
                    // Với trường hợp không có contact, tạo Lead từ stub đọc fields
                    contact: $this->resolveOrBuildDummyContact($conversation, $contactId),
                    attrs: array_filter([
                        'name' => $conversation->peer_name ?? $conversation->peer_phone ?? 'Liên hệ Zalo',
                        'phone' => $conversation->peer_phone,
                        'pipeline_id' => $pipeline?->id,
                        'stage_id' => $firstStage?->id,
                        'source' => 'Zalo',
                        'contact_id' => $contactId,
                        'conversation_id' => $conversation->id,
                    ], fn ($v) => $v !== null),
                );

                // Link 2 chiều: conversation → lead
                Conversation::where('id', $conversation->id)
                    ->update(['lead_id' => $lead->id]);

                // Link lead → conversation + contact (set trực tiếp vì không qua fillable)
                $lead->conversation_id = $conversation->id;
                if ($contactId !== null) {
                    $lead->contact_id = $contactId;
                }
                $lead->saveQuietly();

                return $lead;
            });
        } catch (QueryException $e) {
            // Finding 15: partial unique index leads(conversation_id) — double-submit race.
            // 23505 = PostgreSQL unique violation → re-fetch Lead đã được tạo bởi request chạy song song.
            if ($e->getCode() === '23505') {
                $freshConversation = Conversation::find($conversation->id);
                if ($freshConversation?->lead_id !== null) {
                    return response()->json([
                        'lead_id' => $freshConversation->lead_id,
                        'existing' => true,
                    ]);
                }
            }
            throw $e;
        }

        return response()->json([
            'lead_id' => $lead->id,
            'existing' => false,
        ]);
    }

    /**
     * Trả Contact model nếu có, hoặc tạo anonymous stub cho LeadService::createFromContact.
     * ponytail: createFromContact chỉ đọc fullName()/email/phone từ Contact —
     * stub này đủ khi không có SĐT / chưa tạo được Contact.
     */
    private function resolveOrBuildDummyContact(Conversation $conversation, ?string $contactId): Contact
    {
        if ($contactId !== null) {
            $contact = Contact::find($contactId);
            if ($contact !== null) {
                return $contact;
            }
        }

        // Stub contact (không save — chỉ để createFromContact đọc fields)
        $stub = new Contact;
        $stub->first_name = $conversation->peer_name ?? 'Khách';
        $stub->phone = $conversation->peer_phone;

        return $stub;
    }
}
