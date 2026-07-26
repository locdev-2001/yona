<?php

namespace App\Http\Controllers\Inbox;

use App\Http\Controllers\Controller;
use App\Models\Attachment;
use App\Models\Conversation;
use App\Services\AttachmentService;
use App\Support\TenantScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * P04 — media composer: upload trước, send sau (send endpoint giữ JSON thuần).
 *
 * store: multipart upload → Attachment morph Conversation, private disk (A3).
 * show:  hiển thị trong chat — quyền = xem conversation (KHÔNG AttachmentPolicy
 *        view vì policy đó là uploader-only; media chat mọi member xem được).
 * raw:   bridge fetch — signed URL TTL ngắn, KHÔNG session → bind RLS thủ công
 *        từ param ws đã ký (cùng khuôn với webhook của adapter kênh).
 */
class ConversationAttachmentController extends Controller
{
    /** Cap tĩnh bảo thủ 20MB CHUNG mọi loại (validate đã chốt — bỏ cap ảnh 10MB ảo). */
    public const MAX_UPLOAD_KB = 20480;

    /**
     * Mime allowlist (review H1 — chặn stored XSS): KHÔNG html/svg/xml/js.
     * Loại nghiệp vụ SME thật: ảnh, video, audio, pdf, office, nén, text.
     */
    private const ALLOWED_MIMES = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/quicktime',
        'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/aac', 'audio/wav',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
        'text/plain', 'text/csv',
    ];

    public function store(Request $request, Conversation $conversation, AttachmentService $service): JsonResponse
    {
        $this->authorize('update', $conversation);

        $request->validate([
            'file' => ['required', 'file', 'max:'.self::MAX_UPLOAD_KB, 'mimetypes:'.implode(',', self::ALLOWED_MIMES)],
        ]);

        $attachment = $service->store($conversation, $request->file('file'));

        return response()->json([
            'attachment_id' => $attachment->id,
            'media_kind' => $attachment->mediaKind(),
            'filename' => $attachment->original_name,
            'size' => $attachment->size,
        ], 201);
    }

    public function show(string $attachmentKey): StreamedResponse
    {
        $attachment = Attachment::where('attachment_key', $attachmentKey)
            ->where('attachable_type', 'conversation')
            ->firstOrFail();

        $conversation = Conversation::findOrFail($attachment->attachable_id);
        $this->authorize('view', $conversation);

        return $this->streamAttachment($attachment);
    }

    /**
     * GET signed (middleware 'signed') — không auth session. workspace_id nằm trong
     * URL đã ký nên không giả mạo được; bind RLS rồi forget trong finally (F19).
     */
    public function raw(Request $request, string $attachmentKey): StreamedResponse
    {
        TenantScope::forget();

        try {
            TenantScope::bind((string) $request->query('ws'));

            $attachment = Attachment::withoutGlobalScopes()
                ->where('workspace_id', (string) $request->query('ws'))
                ->where('attachment_key', $attachmentKey)
                ->where('attachable_type', 'conversation')
                ->firstOrFail();

            return $this->streamAttachment($attachment);
        } finally {
            TenantScope::forget();
        }
    }

    /** Mime an toàn render inline trong <img>/<video>/<audio> — còn lại ép download (defense-in-depth H1). */
    private const INLINE_SAFE_MIMES = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/aac', 'audio/wav',
    ];

    private function streamAttachment(Attachment $attachment): StreamedResponse
    {
        $disk = config('filesystems.default');

        abort_unless($attachment->path && Storage::disk($disk)->exists($attachment->path), 404);

        $inline = in_array((string) $attachment->mime, self::INLINE_SAFE_MIMES, true);

        return Storage::disk($disk)->response(
            $attachment->path,
            $attachment->original_name,
            ['X-Content-Type-Options' => 'nosniff'],
            $inline ? 'inline' : 'attachment',
        );
    }
}
