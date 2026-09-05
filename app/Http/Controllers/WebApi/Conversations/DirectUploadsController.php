<?php

namespace App\Http\Controllers\WebApi\Conversations;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Attachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

// Tương đương Api::V1::Accounts::Conversations::DirectUploadsController.
// Không có ActiveStorage nên gộp hai bước (tạo blob → PUT tệp) thành một lần
// POST multipart; signed_id trả về đem gắn vào attachments[] của messages.
class DirectUploadsController extends Controller
{
    public function store(Request $request, Account $account, int $conversationId): JsonResponse
    {
        $this->fetchConversationForUser($request, $account, $conversationId);

        $request->validate(['file' => ['required', 'file']]);

        $attributes = Attachment::storeUpload($request->file('file'), $account->id);

        return response()->json([
            'signed_id' => Attachment::signUpload($attributes),
            'filename' => $attributes['filename'],
            'content_type' => $attributes['content_type'],
            'byte_size' => $attributes['byte_size'],
            'url' => (string) Storage::disk($attributes['disk'])->url($attributes['path']),
        ]);
    }
}
